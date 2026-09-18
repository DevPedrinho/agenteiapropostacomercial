import type { PricingRates, Quote, QuoteItem } from "./quote-types";

/**
 * Motor de precificação. Reproduz a conta da planilha dos vendedores:
 *
 *   custo com entrada = custo × (1 + entrada%)
 *   base              = custo com entrada × (1 + markup%)
 *   preço de venda    = base ÷ (1 − saída% − CET%)
 *
 * Imposto de saída e CET incidem sobre o preço final, então entram como
 * divisor ("gross-up"): o que sobra depois de pagar os dois é exatamente a
 * base, e o lucro líquido é o markup sobre o custo com entrada.
 */

/** Menor divisor aceito: evita preço infinito se saída + CET ≥ 100%. */
const MIN_DIVISOR = 0.05;

export type ItemPricing = {
  rates: PricingRates;
  qty: number;
  unitCost: number;
  /** Custo unitário com imposto de entrada. */
  unitLandedCost: number;
  unitInboundTax: number;
  unitPrice: number;
  unitOutboundTax: number;
  unitCet: number;
  unitProfit: number;
  /** Totais da linha (× quantidade). */
  cost: number;
  landedCost: number;
  inboundTax: number;
  price: number;
  outboundTax: number;
  cet: number;
  profit: number;
  /** Lucro líquido ÷ preço de venda. */
  marginPct: number;
};

export type QuoteTotals = {
  itemCount: number;
  unitCount: number;
  cost: number;
  inboundTax: number;
  landedCost: number;
  outboundTax: number;
  cet: number;
  profit: number;
  price: number;
  marginPct: number;
  /** Markup efetivo do orçamento: lucro ÷ custo com entrada. */
  effectiveMarkupPct: number;
  /** Diferença entre o total e a meta (positivo = estourou). `null` sem meta. */
  diffToTarget: number | null;
};

export function resolveRates(item: QuoteItem, defaults: PricingRates): PricingRates {
  return {
    inboundTaxPct: item.inboundTaxPct ?? defaults.inboundTaxPct,
    markupPct: item.markupPct ?? defaults.markupPct,
    cetPct: item.cetPct ?? defaults.cetPct,
    outboundTaxPct: item.outboundTaxPct ?? defaults.outboundTaxPct,
  };
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

export function divisorFor(rates: PricingRates): number {
  const d = 1 - (safe(rates.outboundTaxPct) + safe(rates.cetPct)) / 100;
  return Math.max(d, MIN_DIVISOR);
}

export function unitPriceFor(unitCost: number, rates: PricingRates): number {
  const landed = safe(unitCost) * (1 + safe(rates.inboundTaxPct) / 100);
  const base = landed * (1 + safe(rates.markupPct) / 100);
  return base / divisorFor(rates);
}

export function priceItem(item: QuoteItem, defaults: PricingRates): ItemPricing {
  const rates = resolveRates(item, defaults);
  const qty = Math.max(0, safe(item.qty));
  const unitCost = Math.max(0, safe(item.cost));
  const unitInboundTax = unitCost * (safe(rates.inboundTaxPct) / 100);
  const unitLandedCost = unitCost + unitInboundTax;
  const unitPrice = unitPriceFor(unitCost, rates);
  const unitOutboundTax = unitPrice * (safe(rates.outboundTaxPct) / 100);
  const unitCet = unitPrice * (safe(rates.cetPct) / 100);
  const unitProfit = unitPrice - unitOutboundTax - unitCet - unitLandedCost;
  const price = unitPrice * qty;
  return {
    rates,
    qty,
    unitCost,
    unitLandedCost,
    unitInboundTax,
    unitPrice,
    unitOutboundTax,
    unitCet,
    unitProfit,
    cost: unitCost * qty,
    landedCost: unitLandedCost * qty,
    inboundTax: unitInboundTax * qty,
    price,
    outboundTax: unitOutboundTax * qty,
    cet: unitCet * qty,
    profit: unitProfit * qty,
    marginPct: price > 0 ? (unitProfit * qty) / price : 0,
  };
}

export function totalQuote(quote: Pick<Quote, "items" | "defaults" | "targetBudget">): QuoteTotals {
  const lines = quote.items.map((item) => priceItem(item, quote.defaults));
  const sum = (pick: (l: ItemPricing) => number) => lines.reduce((acc, l) => acc + pick(l), 0);
  const cost = sum((l) => l.cost);
  const inboundTax = sum((l) => l.inboundTax);
  const landedCost = sum((l) => l.landedCost);
  const outboundTax = sum((l) => l.outboundTax);
  const cet = sum((l) => l.cet);
  const profit = sum((l) => l.profit);
  const price = sum((l) => l.price);
  return {
    itemCount: lines.length,
    unitCount: sum((l) => l.qty),
    cost,
    inboundTax,
    landedCost,
    outboundTax,
    cet,
    profit,
    price,
    marginPct: price > 0 ? profit / price : 0,
    effectiveMarkupPct: landedCost > 0 ? profit / landedCost : 0,
    diffToTarget: quote.targetBudget != null ? price - quote.targetBudget : null,
  };
}

/**
 * Markup padrão (em %) que faz o orçamento fechar exatamente na meta.
 *
 * Itens com markup próprio (override) ficam fixos; só os itens que usam o
 * padrão são recalculados. O preço é linear no markup, então:
 *
 *   total(m) = fixo + (1 + m) × S,  S = Σ qty × custo com entrada ÷ divisor
 *   m = (meta − fixo) ÷ S − 1
 *
 * Retorna `null` quando não há item usando o padrão ou a meta é inválida.
 */
export function markupToHitTarget(
  quote: Pick<Quote, "items" | "defaults">,
  target: number
): number | null {
  if (!Number.isFinite(target) || target <= 0) return null;
  let fixed = 0;
  let scale = 0;
  for (const item of quote.items) {
    const rates = resolveRates(item, quote.defaults);
    const qty = Math.max(0, safe(item.qty));
    const landed = Math.max(0, safe(item.cost)) * (1 + safe(rates.inboundTaxPct) / 100);
    const perUnit = (landed * qty) / divisorFor(rates);
    if (item.markupPct != null) {
      fixed += perUnit * (1 + safe(item.markupPct) / 100);
    } else {
      scale += perUnit;
    }
  }
  if (scale <= 0) return null;
  const markup = ((target - fixed) / scale - 1) * 100;
  return Number.isFinite(markup) ? markup : null;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe(value));
}

export function formatPct(value: number, digits = 1): string {
  return `${safe(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Aceita "1.234,56", "1234.56", "R$ 1.234,56" e devolve o número. */
export function parseNumberBR(raw: string): number {
  const s = raw.replace(/[^\d,.-]/g, "").trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const normalized = hasComma ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
