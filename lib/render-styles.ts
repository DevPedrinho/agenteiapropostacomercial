import { getSpecIcon, SECTION_ICONS } from "./icons";
import { groupFullSpecs } from "./spec-groups";
import type { FullSpecItem, ProposalContent, ProposalStyle, SpecItem } from "./types";

const RULE = "━".repeat(36);

function specLine(spec: SpecItem, icon: string | null): string {
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${spec.label} — ${spec.value}`;
}

/** Uma categoria da ficha completa (label + fatos) numa linha só, para os estilos de texto corrido. */
function fullSpecLine(spec: FullSpecItem, icon: string | null): string {
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${spec.label} — ${spec.facts.join("; ")}`;
}

function section(title: string, icon: string | null, body: string): string {
  const heading = icon ? `${icon} ${title}` : title;
  return `${RULE}\n${heading}\n${RULE}\n\n${body}`;
}

/**
 * Comercial: full Dell/Lenovo-style sheet, emoji throughout. Best for
 * e-mail and PDF when the renderer supports emoji.
 */
function renderComercial(c: ProposalContent): string {
  const quickView = c.quickView
    .map((s) => specLine(s, getSpecIcon(s.label)))
    .join("\n");
  const fullSpecs = c.fullSpecs
    .map((s) => fullSpecLine(s, getSpecIcon(s.label)))
    .join("\n");
  const why = c.whyThisConfig.map((line) => `✔ ${line}`).join("\n");
  const indicated = c.indicatedFor.map((line) => `▪ ${line}`).join("\n");

  return [
    `${SECTION_ICONS.title} ${c.productName}`,
    c.skuLine,
    "",
    c.positioning,
    "",
    section("VISÃO RÁPIDA", SECTION_ICONS.quickView, quickView),
    "",
    section("FICHA TÉCNICA COMPLETA", SECTION_ICONS.fullSpecs, fullSpecs),
    "",
    section("POR QUE ESSA CONFIGURAÇÃO", SECTION_ICONS.whyThisConfig, why),
    "",
    section("INDICADO PARA", SECTION_ICONS.indicatedFor, indicated),
  ].join("\n");
}

/**
 * Executivo: identical structure to Comercial, zero emoji. Safe for
 * licitação / TI, and for PDF exporters (e.g. Bling) that turn emoji into
 * empty boxes — ━, ✔, ▪ are plain text characters, not emoji, so they
 * render everywhere.
 */
function renderExecutivo(c: ProposalContent): string {
  const quickView = c.quickView.map((s) => specLine(s, null)).join("\n");
  const fullSpecs = c.fullSpecs.map((s) => fullSpecLine(s, null)).join("\n");
  const why = c.whyThisConfig.map((line) => `✔ ${line}`).join("\n");
  const indicated = c.indicatedFor.map((line) => `▪ ${line}`).join("\n");

  return [
    c.productName,
    c.skuLine,
    "",
    c.positioning,
    "",
    section("VISÃO RÁPIDA", null, quickView),
    "",
    section("FICHA TÉCNICA COMPLETA", null, fullSpecs),
    "",
    section("POR QUE ESSA CONFIGURAÇÃO", null, why),
    "",
    section("INDICADO PARA", null, indicated),
  ].join("\n");
}

/**
 * Compacto: short WhatsApp-ready message. Only the quick view (not the
 * full spec sheet) plus a one-line summary of each argument block.
 */
function renderCompacto(c: ProposalContent): string {
  const quickView = c.quickView
    .map((s) => specLine(s, getSpecIcon(s.label)))
    .join("\n");
  const why = c.whyThisConfig.map((line) => `✔ ${line}`).join("\n");
  const indicated = c.indicatedFor.map((line) => `▪ ${line}`).join("\n");

  return [
    `*${SECTION_ICONS.title} ${c.productName}*`,
    c.skuLine,
    "",
    c.positioning,
    "",
    "*Principais specs:*",
    quickView,
    "",
    "*Por que essa configuração:*",
    why,
    "",
    "*Indicado para:*",
    indicated,
  ].join("\n");
}

/**
 * B2B: ficha técnica agrupada por seção (Performance, Memória e
 * Armazenamento, Estrutura e Energia), cada categoria com seus fatos como
 * bullets — o mesmo padrão das páginas de produto da Dell/Lenovo. Fecha
 * com "Aplicações Recomendadas" e "Destaques da Configuração".
 */
function renderB2B(c: ProposalContent): string {
  const groups = groupFullSpecs(c.fullSpecs);
  const specSheet = groups
    .map(({ group, items }) => {
      const itemsText = items
        .map((item) => [item.label, ...item.facts.map((f) => `• ${f}`)].join("\n"))
        .join("\n\n");
      return `${group}\n\n${itemsText}`;
    })
    .join("\n\n");

  const apps = c.indicatedFor.map((line) => `✔ ${line}`).join("\n");
  const highlights = c.quickView.map((s) => `✅ ${s.label} — ${s.value}`).join("\n");

  return [
    "Especificações Técnicas",
    "",
    `${c.productName} — ${c.skuLine}`,
    "",
    specSheet,
    "",
    "Aplicações Recomendadas",
    "",
    apps,
    "",
    "Destaques da Configuração",
    "",
    highlights,
  ].join("\n");
}

const RENDERERS: Record<ProposalStyle, (c: ProposalContent) => string> = {
  comercial: renderComercial,
  executivo: renderExecutivo,
  compacto: renderCompacto,
  b2b: renderB2B,
};

/** Re-renders the same structured content in a different style — no generation call needed. */
export function renderProposal(
  content: ProposalContent,
  style: ProposalStyle
): string {
  return RENDERERS[style](content);
}
