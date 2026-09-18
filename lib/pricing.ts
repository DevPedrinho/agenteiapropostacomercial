import type { PricingRates, QuoteItem } from "./quote-types";

/**
 * Motor de precificação — a mesma conta da planilha dos vendedores:
 *
 *   CET (custo efetivo total) = custo × (1 + imposto de entrada%)
 *   base                       = CET × (1 + markup%)          ← "MARKUP" na planilha
 *   preço de venda             = base ÷ (1 − imposto de saída%)
 *
 * O imposto de saída incide sobre o preço final, então entra como divisor
 * ("gross-up"): o que sobra depois de pagá-lo é exatamente a base, e o lucro
 * líquido é o markup sobre o CET. Com imposto de saída zero, preço = CET × markup,
 * idêntico à planilha.
 */

/** Menor divisor aceito: evita preço infinito se saída ≥ 100%. */
const MIN_DIVISOR = 0.05;

export type ItemPricing = {
  rates: PricingRates;
  qty: number;
  unitCost: number;
  /** CET unitário: custo com imposto de entrada. */
  unitCet: number;
  unitInboundTax: number;
  unitPrice: number;
  unitOutboundTax: number;
  unitProfit: number;
  /** Totais da linha (× quantidade). */
  cost: number;
  cet: number;
  inboundTax: number;
  price: number;
  outboundTax: number;
  profit: number;
  /** Lucro líquido ÷ preço de venda. */
  marginPct: number;
};

export type QuoteTotals = {
  itemCount: number;
  unitCount: number;
  cost: number;
  inboundTax: number;
  cet: number;
  outboundTax: number;
  profit: number;
  price: number;
  marginPct: number;
  /** Markup efetivo: lucro ÷ CET. */
  effectiveMarkupPct: number;
  /** Diferença entre o total e a meta (positivo = estourou). `null` sem meta. */
  diffToTarget: number | null;
};

export function resolveRates(item: QuoteItem, defaults: PricingRates): PricingRates {
  return {
    inboundTaxPct: item.inboundTaxPct ?? defaults.inboundTaxPct,
    markupPct: item.markupPct ?? defaults.markupPct,
    outboundTaxPct: item.outboundTaxPct ?? defaults.outboundTaxPct,
  };
}

function safe(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

export function divisorFor(rates: PricingRates): number {
  return Math.max(1 - safe(rates.outboundTaxPct) / 100, MIN_DIVISOR);
}

export function unitPriceFor(unitCost: number, rates: PricingRates): number {
  const cet = safe(unitCost) * (1 + safe(rates.inboundTaxPct) / 100);
  const base = cet * (1 + safe(rates.markupPct) / 100);
  return base / divisorFor(rates);
}

export function priceItem(item: QuoteItem, defaults: PricingRates): ItemPricing {
  const rates = resolveRates(item, defaults);
  const qty = Math.max(0, safe(item.qty));
  const unitCost = Math.max(0, safe(item.cost));
  const unitInboundTax = unitCost * (safe(rates.inboundTaxPct) / 100);
  const unitCet = unitCost + unitInboundTax;
  const unitPrice = unitPriceFor(unitCost, rates);
  const unitOutboundTax = unitPrice * (safe(rates.outboundTaxPct) / 100);
  const unitProfit = unitPrice - unitOutboundTax - unitCet;
  const price = unitPrice * qty;
  return {
    rates,
    qty,
    unitCost,
    unitCet,
    unitInboundTax,
    unitPrice,
    unitOutboundTax,
    unitProfit,
    cost: unitCost * qty,
    cet: unitCet * qty,
    inboundTax: unitInboundTax * qty,
    price,
    outboundTax: unitOutboundTax * qty,
    profit: unitProfit * qty,
    marginPct: price > 0 ? (unitProfit * qty) / price : 0,
  };
}

export function totalItems(
  items: QuoteItem[],
  defaults: PricingRates,
  targetBudget: number | null = null
): QuoteTotals {
  const lines = items.map((item) => priceItem(item, defaults));
  const sum = (pick: (l: ItemPricing) => number) => lines.reduce((acc, l) => acc + pick(l), 0);
  const cost = sum((l) => l.cost);
  const inboundTax = sum((l) => l.inboundTax);
  const cet = sum((l) => l.cet);
  const outboundTax = sum((l) => l.outboundTax);
  const profit = sum((l) => l.profit);
  const price = sum((l) => l.price);
  return {
    itemCount: lines.length,
    unitCount: sum((l) => l.qty),
    cost,
    inboundTax,
    cet,
    outboundTax,
    profit,
    price,
    marginPct: price > 0 ? profit / price : 0,
    effectiveMarkupPct: cet > 0 ? profit / cet : 0,
    diffToTarget: targetBudget != null ? price - targetBudget : null,
  };
}

/**
 * Markup padrão (em %) que faz a opção fechar exatamente na meta.
 *
 * Itens com markup próprio (override) ficam fixos; só os itens que usam o
 * padrão são recalculados. O preço é linear no markup, então:
 *
 *   total(m) = fixo + (1 + m) × S,  S = Σ qty × CET ÷ divisor
 *   m = (meta − fixo) ÷ S − 1
 *
 * Retorna `null` quando não há item usando o padrão ou a meta é inválida.
 */
export function markupToHitTarget(items: QuoteItem[], defaults: PricingRates, target: number): number | null {
  if (!Number.isFinite(target) || target <= 0) return null;
  let fixed = 0;
  let scale = 0;
  for (const item of items) {
    const rates = resolveRates(item, defaults);
    const qty = Math.max(0, safe(item.qty));
    const cet = Math.max(0, safe(item.cost)) * (1 + safe(rates.inboundTaxPct) / 100);
    const perUnit = (cet * qty) / divisorFor(rates);
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

/** Multiplicador como na planilha: 50% → "×1,50". */
export function formatMultiplier(pct: number): string {
  return `×${(1 + safe(pct) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
