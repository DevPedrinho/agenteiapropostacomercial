import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatMultiplier,
  markupToHitTarget,
  parseNumberBR,
  priceItem,
  totalItems,
  unitPriceFor,
} from "../lib/pricing.ts";
import { DEFAULT_RATES, newQuoteItem, parseMarkupInput, type PricingRates } from "../lib/quote-types.ts";

const close = (a: number, b: number, msg?: string) =>
  assert.ok(Math.abs(a - b) < 1e-6, msg ?? `${a} ≠ ${b}`);

test("sem imposto de saída, preço = CET × markup, como na planilha", () => {
  // Aba "Conjo Avião": custo 1050, imposto ×1,00, markup ×1,35 → 1417,50
  close(unitPriceFor(1050, { inboundTaxPct: 0, markupPct: 35, outboundTaxPct: 0 }), 1417.5);
  // Aba "ENTERPRISE": custo 949 × 1,0697 = 1015,1453 (CET) × 1,35 = 1370,446155
  close(unitPriceFor(949, { inboundTaxPct: 6.97, markupPct: 35, outboundTaxPct: 0 }), 1370.446155);
});

test("imposto de saída entra como divisor (gross-up)", () => {
  const rates: PricingRates = { inboundTaxPct: 10, markupPct: 20, outboundTaxPct: 6 };
  // custo 1000 → CET 1100 → base 1320 → ÷ 0,94
  close(unitPriceFor(1000, rates), 1320 / 0.94);
});

test("lucro líquido é o markup sobre o CET e a decomposição fecha", () => {
  const rates: PricingRates = { inboundTaxPct: 10, markupPct: 20, outboundTaxPct: 6 };
  const item = newQuoteItem({ cost: 1000, qty: 2 });
  const p = priceItem(item, rates);
  close(p.unitCet, 1100);
  close(p.unitProfit, 1100 * 0.2);
  close(p.profit, 1100 * 0.2 * 2);
  close(p.outboundTax + p.cet + p.profit, p.price, "decomposição fecha");
});

test("override no item vence o padrão do orçamento", () => {
  const item = newQuoteItem({ cost: 100, markupPct: 50 });
  const p = priceItem(item, { inboundTaxPct: 0, markupPct: 10, outboundTaxPct: 0 });
  close(p.unitPrice, 150);
});

test("saída ≥ 100% não gera preço infinito", () => {
  const p = unitPriceFor(100, { inboundTaxPct: 0, markupPct: 0, outboundTaxPct: 120 });
  assert.ok(Number.isFinite(p));
});

test("totais e diferença para a meta", () => {
  const defaults = { inboundTaxPct: 0, markupPct: 25, outboundTaxPct: 0 };
  const items = [newQuoteItem({ cost: 400 }), newQuoteItem({ cost: 200, qty: 2 })];
  const t = totalItems(items, defaults, 1000);
  close(t.cost, 800);
  close(t.price, 1000);
  close(t.profit, 200);
  close(t.diffToTarget!, 0);
  close(t.effectiveMarkupPct, 0.25);
  close(t.marginPct, 0.2);
});

test("markup para fechar na meta respeita overrides", () => {
  const defaults = { inboundTaxPct: 10, markupPct: 25, outboundTaxPct: 5 };
  const items = [newQuoteItem({ cost: 1000 }), newQuoteItem({ cost: 500, markupPct: 0 })];
  const m = markupToHitTarget(items, defaults, 3000);
  assert.ok(m != null);
  close(totalItems(items, { ...defaults, markupPct: m! }, 3000).price, 3000);
});

test("markup para a meta sem item variável devolve null", () => {
  assert.equal(markupToHitTarget([newQuoteItem({ cost: 10, markupPct: 5 })], DEFAULT_RATES, 100), null);
  assert.equal(markupToHitTarget([], DEFAULT_RATES, 100), null);
});

test("markup aceita multiplicador da planilha ou percentual", () => {
  close(parseMarkupInput("1,35")!, 35);
  close(parseMarkupInput("1.5")!, 50);
  close(parseMarkupInput("2")!, 100);
  close(parseMarkupInput("35")!, 35);
  assert.equal(parseMarkupInput(""), null);
  assert.equal(formatMultiplier(35), "×1,35");
});

test("parseNumberBR entende formato brasileiro e americano", () => {
  assert.equal(parseNumberBR("R$ 1.234,56"), 1234.56);
  assert.equal(parseNumberBR("1234.56"), 1234.56);
  assert.equal(parseNumberBR("12,5"), 12.5);
  assert.equal(parseNumberBR(""), 0);
});
