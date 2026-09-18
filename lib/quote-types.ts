/**
 * Tipos do montador de setup.
 *
 * Reproduz a planilha dos vendedores: cada peça tem fornecedor, custo, imposto
 * de entrada e markup; o "CET" (custo efetivo total) é custo × imposto de
 * entrada, e o preço de venda é CET × markup. Imposto de saída incide sobre
 * a venda. Um percentual `null` no item significa "usar o padrão do orçamento".
 *
 * Um orçamento (cliente) pode ter várias opções de máquina — na planilha eram
 * blocos empilhados na mesma aba, comparados contra a meta do cliente.
 */

export const ITEM_CATEGORIES = [
  "Processador",
  "Placa-mãe",
  "Memória RAM",
  "Armazenamento",
  "Placa de vídeo",
  "Fonte",
  "Gabinete",
  "Refrigeração",
  "Sistema operacional",
  "Periférico",
  "Monitor",
  "Serviço / Montagem",
  "Outro",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type PricingRates = {
  /** Imposto de entrada (%): incide sobre o custo de compra. Na planilha, o ×1,10. */
  inboundTaxPct: number;
  /** Markup (%): sobre o CET. Na planilha, o ×1,35 / ×1,50. */
  markupPct: number;
  /** Imposto de saída (%): sobre o preço de venda. */
  outboundTaxPct: number;
};

export type PricingOverrides = {
  [K in keyof PricingRates]: number | null;
};

export type QuoteItem = PricingOverrides & {
  id: string;
  category: ItemCategory;
  name: string;
  /** De onde vem a peça: "Estoque Upar", Mazer, Infocwb, Kabum, Mercado Livre… */
  supplier: string;
  /** Link do produto no fornecedor / marketplace. */
  link: string;
  qty: number;
  /** Custo unitário de compra, sem imposto de entrada. */
  cost: number;
  /** Preenchidos quando o item veio do Bling. */
  blingProductId?: number;
  blingCode?: string;
  /** Saldo virtual em estoque no momento da consulta; `null` = desconhecido. */
  stock?: number | null;
  stockCheckedAt?: string;
};

/** Uma configuração de máquina dentro do orçamento (Opção 1, Opção 2…). */
export type Variant = {
  id: string;
  name: string;
  items: QuoteItem[];
};

export type Quote = {
  id: string;
  customer: string;
  /** Nome da máquina / projeto. */
  name: string;
  /** Valor que o cliente quer gastar (ex: 10.000). `null` = sem meta. */
  targetBudget: number | null;
  defaults: PricingRates;
  variants: Variant[];
  activeVariantId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const BLING_SUPPLIER = "Estoque Upar";

export const DEFAULT_RATES: PricingRates = {
  inboundTaxPct: 10,
  markupPct: 50,
  outboundTaxPct: 0,
};

export function newQuoteItem(partial: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: makeId(),
    category: "Outro",
    name: "",
    supplier: "",
    link: "",
    qty: 1,
    cost: 0,
    inboundTaxPct: null,
    markupPct: null,
    outboundTaxPct: null,
    ...partial,
  };
}

export function newVariant(name = "Opção 1", items: QuoteItem[] = []): Variant {
  return { id: makeId(), name, items };
}

export function newQuote(defaults: PricingRates = DEFAULT_RATES): Quote {
  const now = new Date().toISOString();
  const first = newVariant();
  return {
    id: makeId(),
    customer: "",
    name: "",
    targetBudget: null,
    defaults: { ...defaults },
    variants: [first],
    activeVariantId: first.id,
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function activeVariant(quote: Quote): Variant {
  return quote.variants.find((v) => v.id === quote.activeVariantId) ?? quote.variants[0];
}

/** Markup em % ↔ multiplicador da planilha (35 ↔ 1,35). */
export function markupToMultiplier(pct: number): number {
  return 1 + pct / 100;
}

/**
 * Aceita o que o vendedor digitar: "1,35" (multiplicador, como na planilha)
 * ou "35" (percentual). Valores até 5 são lidos como multiplicador.
 */
export function parseMarkupInput(raw: string): number | null {
  const s = raw.replace(",", ".").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n <= 5 ? (n - 1) * 100 : n;
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
