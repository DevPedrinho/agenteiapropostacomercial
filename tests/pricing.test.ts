import { test } from "node:test";
import assert from "node:assert/strict";
import {
  markupToHitTarget,
  parseNumberBR,
  priceItem,
  totalQuote,
  unitPriceFor,
} from "../lib/pricing.ts";
import { DEFAULT_RATES, newQuoteItem, type PricingRates } from "../lib/quote-types.ts";

const close = (a: number, b: number, msg?: string) =>
  assert.ok(Math.abs(a - b) < 1e-6, msg ?? `${a} ≠ ${b}`);

test("preço de venda faz o gross-up de saída e CET", () => {
  const rates: PricingRates = { inboundTaxPct: 10, markupPct: 20, cetPct: 4, outboundTaxPct: 6 };
  // custo 1000 → com entrada 1100 → base 1320 → ÷ 0,90 = 1466,666...
  close(unitPriceFor(1000, rates), 1320 / 0.9);
});

test("lucro líquido é o markup sobre o custo com entrada", () => {
  const rates: PricingRates = { inboundTaxPct: 10, markupPct: 20, cetPct: 4, outboundTaxPct: 6 };
  const item = newQuoteItem({ cost: 1000, qty: 2 });
  const p = priceItem(item, rates);
  close(p.unitProfit, 1100 * 0.2);
  close(p.profit, 1100 * 0.2 * 2);
  close(p.price, (1320 / 0.9) * 2);
  close(p.outboundTax + p.cet + p.landedCost + p.profit, p.price, "decomposição fecha");
});

test("override no item vence o padrão do orçamento", () => {
  const item = newQuoteItem({ cost: 100, markupPct: 50 });
  const p = priceItem(item, { ...DEFAULT_RATES, markupPct: 10 });
  close(p.unitPrice, 150);
});

test("saída + CET ≥ 100% não gera preço infinito", () => {
  const p = unitPriceFor(100, { inboundTaxPct: 0, markupPct: 0, cetPct: 60, outboundTaxPct: 60 });
  assert.ok(Number.isFinite(p));
});

test("totais e diferença para a meta", () => {
  const quote = {
    defaults: { inboundTaxPct: 0, markupPct: 25, cetPct: 0, outboundTaxPct: 0 },
    targetBudget: 1000,
    items: [newQuoteItem({ cost: 400 }), newQuoteItem({ cost: 200, qty: 2 })],
  };
  const t = totalQuote(quote);
  close(t.cost, 800);
  close(t.price, 1000);
  close(t.profit, 200);
  close(t.diffToTarget!, 0);
  close(t.effectiveMarkupPct, 0.25);
  close(t.marginPct, 0.2);
});

test("markup para fechar na meta respeita overrides", () => {
  const quote = {
    defaults: { inboundTaxPct: 10, markupPct: 25, cetPct: 5, outboundTaxPct: 5 },
    items: [
      newQuoteItem({ cost: 1000 }),
      newQuoteItem({ cost: 500, markupPct: 0 }), // fixo
    ],
  };
  const m = markupToHitTarget(quote, 3000);
  assert.ok(m != null);
  const t = totalQuote({ ...quote, defaults: { ...quote.defaults, markupPct: m! }, targetBudget: 3000 });
  close(t.price, 3000);
});

test("markup para a meta sem item variável devolve null", () => {
  const quote = { defaults: DEFAULT_RATES, items: [newQuoteItem({ cost: 10, markupPct: 5 })] };
  assert.equal(markupToHitTarget(quote, 100), null);
  assert.equal(markupToHitTarget({ defaults: DEFAULT_RATES, items: [] }, 100), null);
});

test("parseNumberBR entende formato brasileiro e americano", () => {
  assert.equal(parseNumberBR("R$ 1.234,56"), 1234.56);
  assert.equal(parseNumberBR("1234.56"), 1234.56);
  assert.equal(parseNumberBR("12,5"), 12.5);
  assert.equal(parseNumberBR(""), 0);
});
