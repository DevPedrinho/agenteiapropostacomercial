import type { NextRequest } from "next/server";
import { getBlingConfig, getClient, readSession, BlingError } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/bling/diagnostico — o que está configurado, a URL de callback que
 * precisa estar cadastrada no aplicativo do Bling e, quando conectado, uma
 * amostra bruta das três chamadas usadas (listagem, detalhe, saldos) com os
 * nomes de campo que vieram. Serve para conferir a integração na primeira
 * conexão real sem abrir o código.
 */
export async function GET(request: NextRequest) {
  const cfg = getBlingConfig();
  const origin = request.headers.get("x-forwarded-host")
    ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
    : request.nextUrl.origin;

  const out: Record<string, unknown> = {
    configurado: Boolean(cfg),
    clientIdPrefixo: cfg ? `${cfg.clientId.slice(0, 6)}…` : null,
    apiBaseUrl: cfg?.apiBaseUrl ?? null,
    callbackUrl: `${origin}/api/bling/callback`,
    conectarEm: `${origin}/api/bling/auth`,
    conectado: false,
  };
  if (!cfg) {
    out.proximoPasso = "Defina BLING_CLIENT_ID e BLING_CLIENT_SECRET nas variáveis de ambiente e faça redeploy.";
    return Response.json(out);
  }

  const session = await readSession(cfg);
  if (!session) {
    out.proximoPasso = `Cadastre a callbackUrl no aplicativo do Bling e abra ${out.conectarEm} para autorizar.`;
    return Response.json(out);
  }
  out.conectado = true;
  out.tokenExpiraEm = new Date(session.expiresAt).toISOString();

  // Amostra bruta: mostra os campos como o Bling devolveu, sem o mapeamento do app.
  try {
    const { cfg: c, session: s } = await getClient();
    const raw = async (path: string) => {
      const res = await fetch(`${c.apiBaseUrl}${path}`, {
        headers: { Authorization: `Bearer ${s.accessToken}`, Accept: "application/json" },
        cache: "no-store",
      });
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    };
    const lista = await raw("/produtos?pagina=1&limite=2&criterio=2&tipo=P");
    const primeiro = (lista.body as { data?: { id?: number }[] } | null)?.data?.[0];
    const detalhe = primeiro?.id ? await raw(`/produtos/${primeiro.id}`) : null;
    const saldos = primeiro?.id ? await raw(`/estoques/saldos?idsProdutos[]=${primeiro.id}`) : null;
    const campos = (o: unknown) => (o && typeof o === "object" ? Object.keys(o as object) : []);
    out.amostra = {
      listagem: { status: lista.status, camposDoProduto: campos(primeiro), exemplo: primeiro ?? lista.body },
      detalhe: detalhe
        ? { status: detalhe.status, campos: campos((detalhe.body as { data?: unknown } | null)?.data), exemplo: (detalhe.body as { data?: unknown } | null)?.data ?? detalhe.body }
        : null,
      saldos: saldos ? { status: saldos.status, exemplo: saldos.body } : null,
    };
    out.leitura = {
      temSaldoNaListagem: Boolean((primeiro as { estoque?: { saldoVirtual?: number } } | undefined)?.estoque?.saldoVirtual != null),
      temCustoNoDetalhe: Boolean(
        (detalhe?.body as { data?: { precoCusto?: number; fornecedor?: { precoCusto?: number } } } | null)?.data?.precoCusto != null ||
          (detalhe?.body as { data?: { fornecedor?: { precoCusto?: number } } } | null)?.data?.fornecedor?.precoCusto != null
      ),
    };
  } catch (err) {
    out.erroAmostra = err instanceof BlingError ? `${err.status}: ${err.message}` : String(err);
  }
  return Response.json(out);
}
