import {
  activeVariant,
  makeId,
  newVariant,
  type PricingRates,
  type Quote,
  type QuoteItem,
} from "./quote-types";

/**
 * Persistência local (localStorage) dos orçamentos. Sem banco: cada navegador
 * guarda os seus. Exportar CSV serve de backup/compartilhamento.
 */
const KEY = "upar.orcamentos.v2";
const LEGACY_KEY = "upar.orcamentos.v1";
const CURRENT_KEY = "upar.orcamentos.atual";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Formato v1: itens direto no orçamento e `cetPct` nos percentuais. */
type LegacyQuote = {
  id: string;
  name?: string;
  customer?: string;
  targetBudget?: number | null;
  defaults?: Partial<PricingRates> & { cetPct?: number };
  items?: (Omit<QuoteItem, "supplier"> & { supplier?: string; cetPct?: number | null })[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

function migrateLegacy(q: LegacyQuote): Quote {
  const now = new Date().toISOString();
  const items: QuoteItem[] = (q.items ?? []).map((i) => {
    const { cetPct: _cet, ...rest } = i;
    void _cet;
    return { ...rest, supplier: i.supplier ?? (i.blingProductId ? "Estoque Upar" : "") };
  });
  const variant = newVariant("Opção 1", items);
  return {
    id: q.id || makeId(),
    customer: q.customer ?? "",
    name: q.name ?? "",
    targetBudget: q.targetBudget ?? null,
    defaults: {
      inboundTaxPct: q.defaults?.inboundTaxPct ?? 10,
      markupPct: q.defaults?.markupPct ?? 50,
      outboundTaxPct: q.defaults?.outboundTaxPct ?? 0,
    },
    variants: [variant],
    activeVariantId: variant.id,
    notes: q.notes ?? "",
    createdAt: q.createdAt ?? now,
    updatedAt: q.updatedAt ?? now,
  };
}

function normalize(q: Quote): Quote {
  if (!Array.isArray(q.variants) || q.variants.length === 0) {
    const v = newVariant();
    return { ...q, variants: [v], activeVariantId: v.id };
  }
  const active = activeVariant(q);
  return { ...q, activeVariantId: active.id };
}

export function loadQuotes(): Quote[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Quote[]).map(normalize) : [];
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const migrated = Array.isArray(parsed) ? (parsed as LegacyQuote[]).map(migrateLegacy) : [];
      saveQuotes(migrated);
      window.localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: Quote[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(quotes));
  } catch {
    // quota cheia ou modo privado: segue sem persistir
  }
}

export function loadCurrentQuoteId(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentQuoteId(id: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // idem
  }
}

/** Passa a lista de peças para a página da ficha de produto (sessionStorage). */
const HANDOFF_KEY = "upar.proposta.handoff";

export type ProposalHandoff = { productName: string; rawSpecs: string };

export function setProposalHandoff(data: ProposalHandoff): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
  } catch {
    // idem
  }
}

export function takeProposalHandoff(): ProposalHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as ProposalHandoff;
    if (typeof parsed?.rawSpecs !== "string") return null;
    return { productName: String(parsed.productName ?? ""), rawSpecs: parsed.rawSpecs };
  } catch {
    return null;
  }
}
