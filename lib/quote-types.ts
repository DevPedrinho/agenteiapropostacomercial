/**
 * Tipos do montador de orçamento personalizado.
 *
 * Cada item leva o custo do fornecedor e quatro percentuais que a planilha
 * dos vendedores já usa: imposto de entrada, markup, CET (custo efetivo total
 * do meio de pagamento: taxa de cartão, parcelamento, antecipação) e imposto
 * de saída. Um percentual `null` no item significa "usar o padrão do orçamento".
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
  /** Imposto de entrada (%): incide sobre o custo de compra. */
  inboundTaxPct: number;
  /** Markup (%): margem sobre o custo com imposto de entrada. */
  markupPct: number;
  /** CET (%): custo efetivo total do pagamento, sobre o preço de venda. */
  cetPct: number;
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

export type Quote = {
  id: string;
  name: string;
  customer: string;
  /** Valor que o cliente quer gastar (ex: 10.000). `null` = sem meta. */
  targetBudget: number | null;
  defaults: PricingRates;
  items: QuoteItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_RATES: PricingRates = {
  inboundTaxPct: 0,
  markupPct: 25,
  cetPct: 0,
  outboundTaxPct: 0,
};

export function newQuoteItem(partial: Partial<QuoteItem> = {}): QuoteItem {
  return {
    id: makeId(),
    category: "Outro",
    name: "",
    link: "",
    qty: 1,
    cost: 0,
    inboundTaxPct: null,
    markupPct: null,
    cetPct: null,
    outboundTaxPct: null,
    ...partial,
  };
}

export function newQuote(defaults: PricingRates = DEFAULT_RATES): Quote {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name: "",
    customer: "",
    targetBudget: null,
    defaults: { ...defaults },
    items: [],
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
