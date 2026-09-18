import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { classifyProductName } from "./slots";
import type { ItemCategory } from "./quote-types";

/**
 * Cliente da API v3 do Bling (OAuth 2.0, authorization code).
 *
 * O token de cada vendedor fica num cookie httpOnly criptografado (AES-256-GCM),
 * então não precisa de banco: cada pessoa conecta o Bling uma vez no navegador
 * e o refresh token (30 dias, renovado a cada uso) mantém a sessão viva.
 *
 * Endpoints usados (base padrão `https://www.bling.com.br/Api/v3`):
 *   GET  /oauth/authorize?response_type=code&client_id=…&state=…
 *   POST /oauth/token   (Basic client_id:client_secret; grant_type=authorization_code|refresh_token)
 *   GET  /produtos?nome=…&pagina=…&limite=…&criterio=2&tipo=P
 *   GET  /produtos/{id}
 *   GET  /estoques/saldos?idsProdutos[]=…
 */

const COOKIE_NAME = "bling_session";
const STATE_COOKIE = "bling_oauth_state";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias, a validade do refresh token
/** Renova o access token um pouco antes de expirar (Bling: 6 horas). */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

export class BlingError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "BlingError";
    this.status = status;
  }
}

export type BlingConfig = {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
};

export type BlingSession = {
  accessToken: string;
  refreshToken: string;
  /** Epoch em ms. */
  expiresAt: number;
};

export type BlingProduct = {
  id: number;
  name: string;
  code: string;
  /** Preço de venda cadastrado no Bling. */
  price: number | null;
  /** Preço de custo (só vem no detalhe do produto). */
  cost: number | null;
  /** Saldo virtual (físico − reservado). `null` = o Bling não informou. */
  stock: number | null;
  stockPhysical: number | null;
  active: boolean;
  imageUrl: string | null;
  shortDescription: string | null;
};

export type BlingStockBalance = {
  productId: number;
  physical: number | null;
  virtual: number | null;
};

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

export function getBlingConfig(): BlingConfig | null {
  const clientId = process.env.BLING_CLIENT_ID?.trim();
  const clientSecret = process.env.BLING_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const apiBaseUrl = (process.env.BLING_API_BASE_URL?.trim() || "https://www.bling.com.br/Api/v3").replace(
    /\/+$/,
    ""
  );
  return { clientId, clientSecret, apiBaseUrl };
}

export function requireBlingConfig(): BlingConfig {
  const cfg = getBlingConfig();
  if (!cfg) {
    throw new BlingError(
      "Integração com o Bling não configurada: defina BLING_CLIENT_ID e BLING_CLIENT_SECRET.",
      503
    );
  }
  return cfg;
}

/** Chave de 32 bytes derivada de BLING_TOKEN_SECRET (ou, na falta, do client secret). */
function encryptionKey(cfg: BlingConfig): Buffer {
  const secret = process.env.BLING_TOKEN_SECRET?.trim() || cfg.clientSecret;
  return createHash("sha256").update(secret).digest();
}

// ---------------------------------------------------------------------------
// Cookie criptografado
// ---------------------------------------------------------------------------

function seal(payload: unknown, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function unseal<T>(value: string, key: Buffer): T | null {
  try {
    const buf = Buffer.from(value, "base64url");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function readSession(cfg: BlingConfig): Promise<BlingSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const s = unseal<BlingSession>(raw, encryptionKey(cfg));
  if (!s || typeof s.accessToken !== "string" || typeof s.refreshToken !== "string") return null;
  return s;
}

export async function writeSession(cfg: BlingConfig, session: BlingSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, seal(session, encryptionKey(cfg)), cookieOptions(COOKIE_MAX_AGE));
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export async function buildAuthorizeUrl(cfg: BlingConfig): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, state, cookieOptions(10 * 60));
  const url = new URL(`${cfg.apiBaseUrl}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function consumeOAuthState(expected: string | null): Promise<boolean> {
  const store = await cookies();
  const saved = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  return Boolean(saved && expected && saved === expected);
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

async function tokenRequest(cfg: BlingConfig, body: URLSearchParams): Promise<BlingSession> {
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const res = await fetch(`${cfg.apiBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: body.toString(),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token || !data.refresh_token) {
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    throw new BlingError(`Bling recusou o token: ${detail}`, res.status === 401 ? 401 : 502);
  }
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 6 * 60 * 60;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
}

export function exchangeCode(cfg: BlingConfig, code: string): Promise<BlingSession> {
  return tokenRequest(cfg, new URLSearchParams({ grant_type: "authorization_code", code }));
}

export function refreshSession(cfg: BlingConfig, session: BlingSession): Promise<BlingSession> {
  return tokenRequest(
    cfg,
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken })
  );
}

// ---------------------------------------------------------------------------
// Chamadas autenticadas
// ---------------------------------------------------------------------------

type BlingErrorBody = {
  error?: { type?: string; message?: string; description?: string };
};

/**
 * Garante uma sessão válida (renova se perto de expirar) e devolve o cliente.
 * Quando a renovação acontece, o cookie é reescrito.
 */
export async function getClient(): Promise<{ cfg: BlingConfig; session: BlingSession }> {
  const cfg = requireBlingConfig();
  let session = await readSession(cfg);
  if (!session) {
    throw new BlingError("Bling não conectado neste navegador. Clique em “Conectar ao Bling”.", 401);
  }
  if (session.expiresAt - REFRESH_SKEW_MS <= Date.now()) {
    try {
      session = await refreshSession(cfg, session);
      await writeSession(cfg, session);
    } catch (err) {
      await clearSession();
      throw err instanceof BlingError
        ? new BlingError("Sessão do Bling expirou. Conecte de novo.", 401)
        : err;
    }
  }
  return { cfg, session };
}

async function apiGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  const { cfg, session } = await getClient();
  const url = `${cfg.apiBaseUrl}${path}${params && params.size > 0 ? `?${params}` : ""}`;

  const doFetch = (token: string) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });

  let res = await doFetch(session.accessToken);
  if (res.status === 401) {
    // Token invalidado antes do prazo (ex: reconectou em outro lugar). Uma tentativa de refresh.
    const renewed = await refreshSession(cfg, session).catch(() => null);
    if (!renewed) {
      await clearSession();
      throw new BlingError("Sessão do Bling expirou. Conecte de novo.", 401);
    }
    await writeSession(cfg, renewed);
    res = await doFetch(renewed.accessToken);
  }
  if (res.status === 429) {
    throw new BlingError("Limite de requisições do Bling atingido (3 por segundo). Tente de novo.", 429);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as BlingErrorBody;
    const detail = body.error?.description || body.error?.message || `HTTP ${res.status}`;
    throw new BlingError(`Erro do Bling: ${detail}`, 502);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Produtos e estoque
// ---------------------------------------------------------------------------

type RawProduct = {
  id?: number;
  nome?: string;
  codigo?: string;
  preco?: number;
  precoCusto?: number;
  situacao?: string;
  imagemURL?: string;
  descricaoCurta?: string;
  estoque?: { saldoVirtual?: number; saldoFisico?: number };
  fornecedor?: { precoCusto?: number; precoCompra?: number };
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapProduct(p: RawProduct): BlingProduct {
  return {
    id: Number(p.id),
    name: String(p.nome ?? "").trim(),
    code: String(p.codigo ?? "").trim(),
    price: num(p.preco),
    cost: num(p.precoCusto) ?? num(p.fornecedor?.precoCusto) ?? num(p.fornecedor?.precoCompra),
    stock: num(p.estoque?.saldoVirtual),
    stockPhysical: num(p.estoque?.saldoFisico),
    active: (p.situacao ?? "A") === "A",
    imageUrl: p.imagemURL || null,
    shortDescription: p.descricaoCurta || null,
  };
}

export const PRODUCTS_PAGE_SIZE = 25;

export async function searchProducts(query: string, page = 1): Promise<BlingProduct[]> {
  const params = new URLSearchParams();
  params.set("pagina", String(Math.max(1, page)));
  params.set("limite", String(PRODUCTS_PAGE_SIZE));
  params.set("criterio", "2"); // só produtos ativos
  params.set("tipo", "P"); // produtos (não serviços)
  if (query.trim()) params.set("nome", query.trim());
  const data = await apiGet<{ data?: RawProduct[] }>("/produtos", params);
  return (data.data ?? []).filter((p) => p.id != null).map(mapProduct);
}

export async function getProduct(id: number): Promise<BlingProduct> {
  const data = await apiGet<{ data?: RawProduct }>(`/produtos/${id}`);
  if (!data.data || data.data.id == null) throw new BlingError("Produto não encontrado no Bling.", 404);
  return mapProduct(data.data);
}

type RawBalance = {
  produto?: { id?: number };
  saldoFisicoTotal?: number;
  saldoVirtualTotal?: number;
};

export async function getStockBalances(ids: number[]): Promise<BlingStockBalance[]> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  if (unique.length === 0) return [];
  const params = new URLSearchParams();
  for (const id of unique) params.append("idsProdutos[]", String(id));
  const data = await apiGet<{ data?: RawBalance[] }>("/estoques/saldos", params);
  return (data.data ?? [])
    .filter((b) => b.produto?.id != null)
    .map((b) => ({
      productId: Number(b.produto!.id),
      physical: num(b.saldoFisicoTotal),
      virtual: num(b.saldoVirtualTotal),
    }));
}

/** Resposta padrão de erro das rotas /api/bling/*. */
export function errorResponse(err: unknown): Response {
  if (err instanceof BlingError) {
    return Response.json({ error: err.message, code: err.status }, { status: err.status });
  }
  const message = err instanceof Error ? err.message : "Erro ao falar com o Bling.";
  return Response.json({ error: message }, { status: 502 });
}

// ---------------------------------------------------------------------------
// Catálogo completo (montador de setup)
// ---------------------------------------------------------------------------

export type CatalogProduct = BlingProduct & { slot: ItemCategory };

export type Catalog = {
  products: CatalogProduct[];
  fetchedAt: string;
  /** Verdadeiro quando o catálogo passou do limite de páginas e foi cortado. */
  truncated: boolean;
  pages: number;
};

const CATALOG_TTL_MS = 5 * 60 * 1000;
/** 100 por página × 40 páginas = 4000 produtos, o bastante para uma loja de informática. */
const CATALOG_MAX_PAGES = 40;
const CATALOG_PAGE_SIZE = 100;
/** Bling: 3 req/s. 400ms entre páginas fica com folga. */
const CATALOG_PAGE_DELAY_MS = 400;

/** Cache por processo. Na Vercel dura enquanto a instância viver; local, 5 min. */
let catalogCache: { key: string; catalog: Catalog; expiresAt: number } | null = null;
let catalogInFlight: Promise<Catalog> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWholeCatalog(): Promise<Catalog> {
  const products: CatalogProduct[] = [];
  let page = 1;
  let truncated = false;
  for (;;) {
    const params = new URLSearchParams();
    params.set("pagina", String(page));
    params.set("limite", String(CATALOG_PAGE_SIZE));
    params.set("criterio", "2");
    params.set("tipo", "P");
    const data = await apiGet<{ data?: RawProduct[] }>("/produtos", params);
    const batch = (data.data ?? []).filter((p) => p.id != null).map(mapProduct);
    for (const p of batch) products.push({ ...p, slot: classifyProductName(p.name) });
    if (batch.length < CATALOG_PAGE_SIZE) break;
    if (page >= CATALOG_MAX_PAGES) {
      truncated = true;
      break;
    }
    page++;
    await sleep(CATALOG_PAGE_DELAY_MS);
  }

  // Se a listagem não trouxe saldo, completa pelo endpoint de saldos em lotes.
  const missing = products.filter((p) => p.stock == null).map((p) => p.id);
  if (missing.length > 0 && missing.length === products.length) {
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100);
      const balances = await getStockBalances(chunk).catch(() => []);
      const byId = new Map(balances.map((b) => [b.productId, b]));
      for (const p of products) {
        const b = byId.get(p.id);
        if (b) {
          p.stock = b.virtual;
          p.stockPhysical = b.physical;
        }
      }
      if (i + 100 < missing.length) await sleep(CATALOG_PAGE_DELAY_MS);
    }
  }

  return { products, fetchedAt: new Date().toISOString(), truncated, pages: page };
}

/**
 * Catálogo de produtos ativos, classificado por slot, com cache de 5 minutos.
 * Chamadas simultâneas compartilham a mesma busca (evita estourar o rate limit).
 */
export async function getCatalog(refresh = false): Promise<Catalog> {
  const { cfg } = await getClient();
  const key = cfg.clientId;
  const now = Date.now();
  if (!refresh && catalogCache && catalogCache.key === key && catalogCache.expiresAt > now) {
    return catalogCache.catalog;
  }
  if (catalogInFlight) return catalogInFlight;
  catalogInFlight = fetchWholeCatalog()
    .then((catalog) => {
      catalogCache = { key, catalog, expiresAt: Date.now() + CATALOG_TTL_MS };
      return catalog;
    })
    .finally(() => {
      catalogInFlight = null;
    });
  return catalogInFlight;
}
