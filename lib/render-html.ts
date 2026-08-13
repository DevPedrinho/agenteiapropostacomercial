import { getSpecIcon, SECTION_ICONS } from "./icons";
import { groupFullSpecs } from "./spec-groups";
import type { ProposalContent, ProposalStyle } from "./types";

/**
 * Versão HTML da ficha — espelha o cartão visual (components/ProposalPreview.tsx),
 * não o texto de render-styles.ts. Todo estilo é inline (style="..."), sem
 * classes nem <style>: editores de terceiros (ex: o campo "código-fonte" do
 * Bling) costumam ignorar/descartar CSS externo ao colar HTML, mas preservam
 * atributos style de cada elemento — é a mesma técnica usada em e-mail HTML.
 * Layouts em coluna usam <table>, não flex/grid, pelo mesmo motivo de
 * compatibilidade.
 */

const COLOR = {
  bg: "#f8f6f2",
  text: "#1c1c1a",
  muted: "#6b6b63",
  border: "#e3ded2",
  accent: "#2c5fd6",
  chipBg: "rgba(44, 95, 214, 0.08)",
  chipBorder: "rgba(44, 95, 214, 0.25)",
  tagBg: "#eef2fb",
  check: "#2c8a5f",
};
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function chipRow(parts: string[]): string {
  const chips = parts
    .map(
      (p) =>
        `<span style="display:inline-block;background:${COLOR.chipBg};color:${COLOR.accent};border:1px solid ${COLOR.chipBorder};border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;margin:0 6px 6px 0;">${esc(p.trim())}</span>`
    )
    .join("");
  return `<div style="margin:0 0 12px 0;">${chips}</div>`;
}

function sectionTitle(title: string): string {
  return `<p style="font-size:12px;text-transform:uppercase;letter-spacing:0.07em;color:${COLOR.muted};margin:22px 0 10px 0;padding-bottom:6px;border-bottom:1px solid ${COLOR.border};">${esc(title)}</p>`;
}

/** Layout de N colunas usando <table>, para funcionar em editores que não herdam flex/grid. */
function columnTable(cellsHtml: string[], columns: number): string {
  const rows: string[] = [];
  for (let i = 0; i < cellsHtml.length; i += columns) {
    const rowCells = cellsHtml.slice(i, i + columns);
    while (rowCells.length < columns) rowCells.push("");
    rows.push(
      `<tr>${rowCells
        .map(
          (cell) =>
            `<td style="width:${100 / columns}%;vertical-align:top;padding:0 5px 5px 0;">${cell}</td>`
        )
        .join("")}</tr>`
    );
  }
  return `<table style="width:100%;border-collapse:collapse;margin:0;padding:0;"><tbody>${rows.join("")}</tbody></table>`;
}

function quickItemCell(label: string, value: string, icon: string | null): string {
  const prefix = icon ? `${icon} ` : "";
  return `<div style="background:#ffffff;border:1px solid ${COLOR.border};border-radius:9px;padding:9px 11px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.03em;color:${COLOR.muted};margin:0 0 2px 0;">${prefix}${esc(label)}</div>
    <div style="font-size:14px;font-weight:700;line-height:1.3;color:${COLOR.text};">${esc(value)}</div>
  </div>`;
}

function tagList(items: string[]): string {
  return items
    .map(
      (l) =>
        `<span style="display:inline-block;background:${COLOR.tagBg};color:${COLOR.accent};border-radius:6px;padding:4px 9px;font-size:13px;margin:0 6px 6px 0;">${esc(l)}</span>`
    )
    .join("");
}

function checkList(items: string[]): string {
  return items
    .map(
      (l) =>
        `<p style="margin:0 0 7px 0;font-size:14px;line-height:1.4;color:${COLOR.text};"><span style="color:${COLOR.check};margin-right:6px;">✔</span>${esc(l)}</p>`
    )
    .join("");
}

export function renderProposalHtml(content: ProposalContent, style: ProposalStyle): string {
  const showEmoji = style === "comercial" || style === "compacto";
  const isB2B = style === "b2b";
  const isCompacto = style === "compacto";

  const titleIcon = showEmoji ? `${SECTION_ICONS.title} ` : "";
  const header = [
    `<h3 style="margin:0 0 10px 0;font-size:20px;letter-spacing:-0.01em;color:${COLOR.text};">${titleIcon}${esc(content.productName)}</h3>`,
    chipRow(content.skuLine.split("|")),
    isB2B
      ? ""
      : `<p style="color:${COLOR.muted};font-size:15px;line-height:1.5;margin:0 0 0 0;">${esc(content.positioning)}</p>`,
  ].join("");

  const quickCells = content.quickView.map((s) =>
    quickItemCell(s.label, s.value, showEmoji ? getSpecIcon(s.label) : null)
  );
  const quickSection = [
    sectionTitle(isB2B ? "Destaques da configuração" : "Visão rápida"),
    columnTable(quickCells, 2),
  ].join("");

  const specSection = isCompacto
    ? ""
    : [
        sectionTitle("Especificações técnicas"),
        groupFullSpecs(content.fullSpecs)
          .map(({ group, items }) => {
            const itemsHtml = items
              .map(
                (item) =>
                  `<p style="font-weight:700;font-size:14px;margin:0 0 2px 0;color:${COLOR.text};">${esc(item.label)}</p>` +
                  `<ul style="margin:0 0 9px 0;padding-left:18px;color:${COLOR.muted};font-size:13px;line-height:1.5;">${item.facts
                    .map((f) => `<li>${esc(f)}</li>`)
                    .join("")}</ul>`
              )
              .join("");
            return `<p style="font-size:12px;font-weight:700;color:${COLOR.accent};margin:14px 0 8px 0;">${esc(group)}</p>${itemsHtml}`;
          })
          .join(""),
      ].join("");

  const indicatedCol = [
    sectionTitle(isB2B ? "Aplicações recomendadas" : "Indicado para"),
    `<div>${tagList(content.indicatedFor)}</div>`,
  ].join("");

  const whyCol = isB2B
    ? ""
    : [sectionTitle("Por que essa configuração"), checkList(content.whyThisConfig)].join("");

  const bottomSection = isB2B ? indicatedCol : columnTable([indicatedCol, whyCol], 2);

  return `<div style="background:${COLOR.bg};color:${COLOR.text};border:1px solid ${COLOR.border};border-radius:12px;padding:26px 28px;font-family:${FONT};">${header}${quickSection}${specSection}${bottomSection}</div>`;
}
