import { formatBRL, formatMultiplier, formatPct, priceItem, totalItems } from "./pricing";
import type { PricingRates, Quote, Variant } from "./quote-types";

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV separado por `;` (abre direto no Excel em pt-BR), com as colunas da
 * planilha (fornecedor, custo, imposto, CET, markup, venda) e as internas.
 * Todas as opções do orçamento, uma abaixo da outra, como na aba original.
 */
export function quoteToCsv(quote: Quote): string {
  const header = [
    "Opção",
    "Categoria",
    "Fornecedor",
    "Produto",
    "Link",
    "Cód. Bling",
    "Estoque",
    "Qtd",
    "Custo un.",
    "Imposto entrada %",
    "CET un.",
    "Markup ×",
    "Imposto saída %",
    "Preço un.",
    "Total custo",
    "Total venda",
    "Lucro líquido",
    "Margem %",
  ];
  const lines: string[] = ["﻿" + header.join(";")];
  for (const v of quote.variants) {
    for (const item of v.items) {
      const p = priceItem(item, quote.defaults);
      lines.push(
        [
          v.name,
          item.category,
          item.supplier,
          item.name,
          item.link,
          item.blingCode ?? "",
          item.stock ?? "",
          item.qty,
          p.unitCost,
          p.rates.inboundTaxPct,
          p.unitCet,
          1 + p.rates.markupPct / 100,
          p.rates.outboundTaxPct,
          p.unitPrice,
          p.cost,
          p.price,
          p.profit,
          p.marginPct * 100,
        ]
          .map(csvCell)
          .join(";")
      );
    }
    const t = totalItems(v.items, quote.defaults, quote.targetBudget);
    lines.push(
      [`${v.name} — TOTAL`, "", "", "", "", "", "", t.unitCount, t.cost, "", t.cet, "", "", "", t.cost, t.price, t.profit, t.marginPct * 100]
        .map(csvCell)
        .join(";")
    );
    lines.push("");
  }
  return lines.join("\r\n");
}

/** Texto para mandar ao cliente: só o que ele pode ver (sem custo nem margem). */
export function variantToCustomerText(quote: Quote, variant: Variant): string {
  const t = totalItems(variant.items, quote.defaults);
  const lines: string[] = [];
  const title = [quote.name, quote.variants.length > 1 ? variant.name : ""].filter(Boolean).join(" — ");
  lines.push(`ORÇAMENTO${title ? ` — ${title.toUpperCase()}` : ""}`);
  if (quote.customer) lines.push(`Cliente: ${quote.customer}`);
  lines.push("");
  for (const item of variant.items) {
    const p = priceItem(item, quote.defaults);
    const qty = item.qty !== 1 ? ` (${item.qty}x)` : "";
    lines.push(`• ${item.category}: ${item.name || "—"}${qty} — ${formatBRL(p.price)}`);
  }
  lines.push("");
  lines.push(`TOTAL: ${formatBRL(t.price)}`);
  if (quote.notes.trim()) {
    lines.push("");
    lines.push(quote.notes.trim());
  }
  return lines.join("\n");
}

/** Resumo interno rápido (com custo e margem), para conferência no time. */
export function variantToInternalText(quote: Quote, variant: Variant): string {
  const t = totalItems(variant.items, quote.defaults, quote.targetBudget);
  const lines = [
    `${quote.customer || "Cliente"} — ${quote.name || "máquina"}${quote.variants.length > 1 ? ` — ${variant.name}` : ""}`,
    `Custo: ${formatBRL(t.cost)} | CET (c/ imposto ${formatPct(quote.defaults.inboundTaxPct)}): ${formatBRL(t.cet)}`,
    `Venda: ${formatBRL(t.price)} | Lucro líquido: ${formatBRL(t.profit)} (${formatPct(t.marginPct * 100)} da venda, markup efetivo ${formatMultiplier(t.effectiveMarkupPct * 100)})`,
  ];
  if (t.outboundTax > 0) lines.push(`Imposto de saída: ${formatBRL(t.outboundTax)}`);
  if (t.diffToTarget != null) {
    lines.push(
      t.diffToTarget > 0
        ? `Meta ${formatBRL(quote.targetBudget!)}: ${formatBRL(t.diffToTarget)} acima`
        : `Meta ${formatBRL(quote.targetBudget!)}: ${formatBRL(-t.diffToTarget)} de folga`
    );
  }
  return lines.join("\n");
}

/** Comparativo das opções, para o time. */
export function quoteComparisonText(quote: Quote): string {
  return quote.variants
    .map((v) => {
      const t = totalItems(v.items, quote.defaults, quote.targetBudget);
      return `${v.name}: venda ${formatBRL(t.price)} · custo ${formatBRL(t.cost)} · lucro ${formatBRL(t.profit)} (${formatPct(t.marginPct * 100)})`;
    })
    .join("\n");
}

/** Lista de peças no formato que a ficha de produto espera (uma por linha). */
export function variantToPartsList(variant: Variant): string {
  return variant.items
    .filter((i) => i.name.trim())
    .map((i) => (i.qty > 1 ? `${i.qty}x ${i.name.trim()}` : i.name.trim()))
    .join("\n");
}

export type { PricingRates };
