import { formatBRL, formatPct, priceItem, totalQuote } from "./pricing";
import type { Quote } from "./quote-types";

function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV separado por `;` (abre direto no Excel em pt-BR), com todas as colunas internas. */
export function quoteToCsv(quote: Quote): string {
  const header = [
    "Categoria",
    "Item",
    "Link",
    "Cód. Bling",
    "Estoque",
    "Qtd",
    "Custo un.",
    "Imposto entrada %",
    "Markup %",
    "CET %",
    "Imposto saída %",
    "Custo c/ entrada un.",
    "Preço un.",
    "Total venda",
    "Lucro líquido",
    "Margem %",
  ];
  const rows = quote.items.map((item) => {
    const p = priceItem(item, quote.defaults);
    return [
      item.category,
      item.name,
      item.link,
      item.blingCode ?? "",
      item.stock ?? "",
      item.qty,
      p.unitCost,
      p.rates.inboundTaxPct,
      p.rates.markupPct,
      p.rates.cetPct,
      p.rates.outboundTaxPct,
      p.unitLandedCost,
      p.unitPrice,
      p.price,
      p.profit,
      p.marginPct * 100,
    ]
      .map(csvCell)
      .join(";");
  });
  const t = totalQuote(quote);
  const totals = [
    "TOTAL",
    "",
    "",
    "",
    "",
    t.unitCount,
    t.cost,
    "",
    "",
    "",
    "",
    t.landedCost,
    "",
    t.price,
    t.profit,
    t.marginPct * 100,
  ]
    .map(csvCell)
    .join(";");
  return ["﻿" + header.join(";"), ...rows, totals].join("\r\n");
}

/** Texto para mandar ao cliente: só o que ele pode ver (sem custo nem margem). */
export function quoteToCustomerText(quote: Quote): string {
  const t = totalQuote(quote);
  const lines: string[] = [];
  lines.push(`ORÇAMENTO${quote.name ? ` — ${quote.name.toUpperCase()}` : ""}`);
  if (quote.customer) lines.push(`Cliente: ${quote.customer}`);
  lines.push("");
  for (const item of quote.items) {
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
export function quoteToInternalText(quote: Quote): string {
  const t = totalQuote(quote);
  return [
    `Custo: ${formatBRL(t.cost)} | c/ entrada: ${formatBRL(t.landedCost)}`,
    `Venda: ${formatBRL(t.price)} | Lucro líquido: ${formatBRL(t.profit)} (${formatPct(t.marginPct * 100)} da venda)`,
    `Impostos de saída: ${formatBRL(t.outboundTax)} | CET: ${formatBRL(t.cet)}`,
  ].join("\n");
}

/** Lista de peças no formato que a ficha de produto espera (uma por linha). */
export function quoteToPartsList(quote: Quote): string {
  return quote.items
    .filter((i) => i.name.trim())
    .map((i) => (i.qty > 1 ? `${i.qty}x ${i.name.trim()}` : i.name.trim()))
    .join("\n");
}
