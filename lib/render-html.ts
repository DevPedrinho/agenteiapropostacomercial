import { getSpecIcon, SECTION_ICONS } from "./icons";
import { groupFullSpecs } from "./spec-groups";
import type { FullSpecItem, ProposalContent, ProposalStyle, SpecItem } from "./types";

/**
 * Versão HTML dos mesmos 4 estilos de render-styles.ts — para colar em
 * editores de texto rico (ex: o campo "Outros itens ou serviços" do Bling),
 * onde Ctrl+V de texto puro não vira negrito/lista, só texto corrido.
 * navigator.clipboard.write manda os dois formatos (texto e HTML) juntos;
 * cada app escolhe o que sabe ler.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

function specLineText(spec: SpecItem, icon: string | null): string {
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${spec.label} — ${spec.value}`;
}

function fullSpecLineText(spec: FullSpecItem, icon: string | null): string {
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${spec.label} — ${spec.facts.join("; ")}`;
}

function heading(title: string, icon: string | null): string {
  return `<h4>${icon ? `${icon} ` : ""}${esc(title)}</h4>`;
}

function renderComercialHtml(c: ProposalContent): string {
  return [
    `<h3>${SECTION_ICONS.title} ${esc(c.productName)}</h3>`,
    `<p><strong>${esc(c.skuLine)}</strong></p>`,
    `<p>${esc(c.positioning)}</p>`,
    heading("Visão rápida", SECTION_ICONS.quickView),
    ul(c.quickView.map((s) => specLineText(s, getSpecIcon(s.label)))),
    heading("Ficha técnica completa", SECTION_ICONS.fullSpecs),
    ul(c.fullSpecs.map((s) => fullSpecLineText(s, getSpecIcon(s.label)))),
    heading("Por que essa configuração", SECTION_ICONS.whyThisConfig),
    ul(c.whyThisConfig),
    heading("Indicado para", SECTION_ICONS.indicatedFor),
    ul(c.indicatedFor),
  ].join("");
}

function renderExecutivoHtml(c: ProposalContent): string {
  return [
    `<h3>${esc(c.productName)}</h3>`,
    `<p><strong>${esc(c.skuLine)}</strong></p>`,
    `<p>${esc(c.positioning)}</p>`,
    heading("Visão rápida", null),
    ul(c.quickView.map((s) => specLineText(s, null))),
    heading("Ficha técnica completa", null),
    ul(c.fullSpecs.map((s) => fullSpecLineText(s, null))),
    heading("Por que essa configuração", null),
    ul(c.whyThisConfig),
    heading("Indicado para", null),
    ul(c.indicatedFor),
  ].join("");
}

function renderCompactoHtml(c: ProposalContent): string {
  return [
    `<h3>${SECTION_ICONS.title} ${esc(c.productName)}</h3>`,
    `<p><strong>${esc(c.skuLine)}</strong></p>`,
    `<p>${esc(c.positioning)}</p>`,
    heading("Principais specs", null),
    ul(c.quickView.map((s) => specLineText(s, getSpecIcon(s.label)))),
    heading("Por que essa configuração", null),
    ul(c.whyThisConfig),
    heading("Indicado para", null),
    ul(c.indicatedFor),
  ].join("");
}

function renderB2BHtml(c: ProposalContent): string {
  const groups = groupFullSpecs(c.fullSpecs);
  const specSheet = groups
    .map(
      ({ group, items }) =>
        `<h4>${esc(group)}</h4>` +
        items.map((item) => `<p><strong>${esc(item.label)}</strong></p>${ul(item.facts)}`).join("")
    )
    .join("");

  return [
    `<h3>Especificações Técnicas</h3>`,
    `<p>${esc(c.productName)} — <strong>${esc(c.skuLine)}</strong></p>`,
    specSheet,
    heading("Aplicações Recomendadas", null),
    ul(c.indicatedFor),
    heading("Destaques da Configuração", null),
    ul(c.quickView.map((s) => `${s.label} — ${s.value}`)),
  ].join("");
}

const HTML_RENDERERS: Record<ProposalStyle, (c: ProposalContent) => string> = {
  comercial: renderComercialHtml,
  executivo: renderExecutivoHtml,
  compacto: renderCompactoHtml,
  b2b: renderB2BHtml,
};

export function renderProposalHtml(content: ProposalContent, style: ProposalStyle): string {
  return HTML_RENDERERS[style](content);
}
