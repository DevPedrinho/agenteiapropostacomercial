import type { Quote } from "./quote-types";

/**
 * Persistência local (localStorage) dos orçamentos. Sem banco: cada navegador
 * guarda os seus. Exportar CSV serve de backup/compartilhamento.
 */
const KEY = "upar.orcamentos.v1";
const CURRENT_KEY = "upar.orcamentos.atual";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadQuotes(): Quote[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Quote[]) : [];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: Quote[]): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(quotes));
  } catch {
    // quota cheia ou modo privado: segue sem persistir
  }
}

export function loadCurrentQuoteId(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function saveCurrentQuoteId(id: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // idem
  }
}

/** Passa a lista de peças para a página da ficha de produto (sessionStorage). */
const HANDOFF_KEY = "upar.proposta.handoff";

export type ProposalHandoff = { productName: string; rawSpecs: string };

export function setProposalHandoff(data: ProposalHandoff): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(data));
  } catch {
    // idem
  }
}

export function takeProposalHandoff(): ProposalHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(HANDOFF_KEY);
    const parsed = JSON.parse(raw) as ProposalHandoff;
    if (typeof parsed?.rawSpecs !== "string") return null;
    return { productName: String(parsed.productName ?? ""), rawSpecs: parsed.rawSpecs };
  } catch {
    return null;
  }
}
