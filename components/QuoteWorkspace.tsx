"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CatalogPane from "./CatalogPane";
import BuildTable from "./BuildTable";
import SummaryPane from "./SummaryPane";
import { formatBRL, totalItems } from "@/lib/pricing";
import {
  loadCurrentQuoteId,
  loadQuotes,
  saveCurrentQuoteId,
  saveQuotes,
  setProposalHandoff,
} from "@/lib/quote-storage";
import {
  quoteComparisonText,
  quoteToCsv,
  variantToCustomerText,
  variantToInternalText,
  variantToPartsList,
} from "@/lib/quote-export";
import {
  activeVariant,
  BLING_SUPPLIER,
  DEFAULT_RATES,
  newQuote,
  newQuoteItem,
  newVariant,
  type ItemCategory,
  type PricingRates,
  type Quote,
  type QuoteItem,
  type Variant,
} from "@/lib/quote-types";
import type { BlingProduct, BlingStatus, CatalogProduct, CatalogResponse } from "@/lib/bling-client";

type Feedback = { kind: "ok" | "erro"; text: string } | null;

export type Picker = { slot: ItemCategory; replaceItemId: string | null };

type Props = {
  /** Resultado do retorno do OAuth do Bling, lido da URL pela página (?bling=ok|erro). */
  blingResult?: { status: string; detail: string | null } | null;
};

function upsert(list: Quote[], quote: Quote): Quote[] {
  const idx = list.findIndex((q) => q.id === quote.id);
  if (idx === -1) return [quote, ...list];
  const next = list.slice();
  next[idx] = quote;
  return next;
}

function feedbackFromBling(result: Props["blingResult"]): Feedback {
  if (!result) return null;
  if (result.status === "ok") return { kind: "ok", text: "Bling conectado. O estoque está carregando." };
  return { kind: "erro", text: `Falha ao conectar ao Bling: ${result.detail ?? "erro desconhecido"}` };
}

/**
 * Renderizado só no cliente (ver QuoteWorkspaceLoader), então o estado inicial
 * pode ler o localStorage direto, sem efeito de hidratação.
 */
export default function QuoteWorkspace({ blingResult = null }: Props) {
  const router = useRouter();
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>(() => loadQuotes());
  const [quote, setQuote] = useState<Quote>(() => {
    const saved = loadQuotes();
    const currentId = loadCurrentQuoteId();
    return saved.find((q) => q.id === currentId) ?? saved[0] ?? newQuote();
  });
  const [feedback, setFeedback] = useState<Feedback>(() => feedbackFromBling(blingResult));
  const feedbackTimer = useRef<number | null>(null);
  const [blingStatus, setBlingStatus] = useState<BlingStatus | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [picker, setPicker] = useState<Picker>({ slot: "Processador", replaceItemId: null });

  // ---- Bling: status e catálogo ------------------------------------------
  useEffect(() => {
    fetch("/api/bling/status")
      .then((r) => r.json())
      .then((st: BlingStatus) => setBlingStatus(st))
      .catch(() => setBlingStatus({ configured: false, connected: false }));
  }, []);

  const connected = blingStatus == null ? null : Boolean(blingStatus.connected);

  async function requestCatalog(refresh: boolean): Promise<CatalogResponse | "unauthorized"> {
    const res = await fetch(`/api/bling/catalogo${refresh ? "?refresh=1" : ""}`);
    const data = await res.json();
    if (res.status === 401) return "unauthorized";
    if (!res.ok) throw new Error(data.error || "Erro ao carregar o estoque.");
    return data as CatalogResponse;
  }

  function applyCatalog(result: CatalogResponse | "unauthorized") {
    if (result === "unauthorized") {
      setBlingStatus((st) => (st ? { ...st, connected: false } : st));
      return;
    }
    setCatalog(result);
    setCatalogError(null);
  }

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    requestCatalog(false)
      .then((r) => {
        if (!cancelled) applyCatalog(r);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCatalogError(err instanceof Error ? err.message : "Erro ao carregar o estoque.");
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);

  function reloadCatalog() {
    setCatalogLoading(true);
    requestCatalog(true)
      .then(applyCatalog)
      .catch((err: unknown) => setCatalogError(err instanceof Error ? err.message : "Erro ao carregar o estoque."))
      .finally(() => setCatalogLoading(false));
  }

  async function disconnectBling() {
    await fetch("/api/bling/disconnect", { method: "POST" });
    setBlingStatus((st) => (st ? { ...st, connected: false } : st));
    setCatalog(null);
  }

  // Limpa ?bling=… da URL depois de mostrar o aviso.
  useEffect(() => {
    if (blingResult) router.replace("/orcamento");
  }, [blingResult, router]);

  // Autosave: qualquer mudança no orçamento atual vai pro localStorage.
  useEffect(() => {
    saveQuotes(upsert(loadQuotes(), quote));
    saveCurrentQuoteId(quote.id);
  }, [quote]);

  const quotes = useMemo(() => upsert(savedQuotes, quote), [savedQuotes, quote]);

  function notify(kind: "ok" | "erro", text: string) {
    setFeedback({ kind, text });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000);
  }

  const update = useCallback((patch: Partial<Quote>) => {
    setQuote((q) => ({ ...q, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const variant = activeVariant(quote);
  const items = variant.items;
  const totals = useMemo(() => totalItems(items, quote.defaults, quote.targetBudget), [items, quote.defaults, quote.targetBudget]);

  // ---- opções (variantes) ------------------------------------------------
  function updateVariant(id: string, patch: Partial<Variant>) {
    update({ variants: quote.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)) });
  }
  function setItems(next: QuoteItem[]) {
    updateVariant(variant.id, { items: next });
  }
  function addVariant(copyFrom?: Variant) {
    const v = newVariant(`Opção ${quote.variants.length + 1}`, copyFrom ? copyFrom.items.map((i) => ({ ...i, id: newQuoteItem().id })) : []);
    update({ variants: [...quote.variants, v], activeVariantId: v.id });
  }
  function removeVariant(id: string) {
    if (quote.variants.length <= 1) return;
    if (!window.confirm("Apagar esta opção?")) return;
    const rest = quote.variants.filter((v) => v.id !== id);
    update({ variants: rest, activeVariantId: quote.activeVariantId === id ? rest[0].id : quote.activeVariantId });
  }
  function renameVariant(id: string) {
    const v = quote.variants.find((x) => x.id === id);
    if (!v) return;
    const name = window.prompt("Nome da opção", v.name);
    if (name && name.trim()) updateVariant(id, { name: name.trim() });
  }

  // ---- itens -------------------------------------------------------------
  function addItem(partial: Partial<QuoteItem> = {}) {
    setItems([...items, newQuoteItem(partial)]);
  }
  function updateItem(id: string, patch: Partial<QuoteItem>) {
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    setItems(items.filter((i) => i.id !== id));
    if (picker.replaceItemId === id) setPicker({ ...picker, replaceItemId: null });
  }

  function placeProduct(product: BlingProduct, slot: ItemCategory, replaceItemId: string | null) {
    const patch: Partial<QuoteItem> = {
      name: product.name,
      supplier: BLING_SUPPLIER,
      cost: product.cost ?? 0,
      blingProductId: product.id,
      blingCode: product.code || undefined,
      stock: product.stock,
      stockCheckedAt: new Date().toISOString(),
    };
    if (replaceItemId && items.some((i) => i.id === replaceItemId)) {
      updateItem(replaceItemId, patch);
    } else {
      addItem({ ...patch, category: slot });
    }
    if (product.cost == null) {
      notify("erro", `“${product.name}” não tem preço de custo no Bling. Preencha o custo na linha.`);
    } else {
      notify("ok", `${product.name} · custo ${formatBRL(product.cost)}`);
    }
  }

  /** Escolha no estoque: busca o detalhe (custo) e coloca no slot ativo. */
  async function pickFromCatalog(product: CatalogProduct | BlingProduct) {
    let full: BlingProduct = product;
    if (product.cost == null) {
      try {
        const res = await fetch(`/api/bling/produtos/${product.id}`);
        const data = await res.json();
        if (res.ok && data.product) full = { ...product, ...(data.product as BlingProduct), stock: product.stock ?? data.product.stock };
      } catch {
        // segue sem custo; o aviso cobre
      }
    }
    placeProduct(full, picker.slot, picker.replaceItemId);
    setPicker({ slot: picker.slot, replaceItemId: null });
  }

  async function refreshStock() {
    const ids = items.map((i) => i.blingProductId).filter((n): n is number => typeof n === "number");
    if (ids.length === 0) {
      notify("erro", "Nenhuma peça desta opção veio do Bling.");
      return;
    }
    try {
      const res = await fetch(`/api/bling/estoque?ids=${ids.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao consultar estoque.");
      const byId = new Map<number, { virtual: number | null }>(
        (data.balances as { productId: number; virtual: number | null }[]).map((b) => [b.productId, b])
      );
      setItems(
        items.map((i) =>
          i.blingProductId && byId.has(i.blingProductId)
            ? { ...i, stock: byId.get(i.blingProductId)!.virtual, stockCheckedAt: data.checkedAt }
            : i
        )
      );
      notify("ok", "Estoque das peças atualizado.");
    } catch (err) {
      notify("erro", err instanceof Error ? err.message : "Erro ao consultar estoque.");
    }
  }

  // ---- orçamentos --------------------------------------------------------
  function startNew() {
    setSavedQuotes(quotes);
    setQuote(newQuote(quote.defaults));
  }
  function selectQuote(id: string) {
    const q = quotes.find((x) => x.id === id);
    if (q) setQuote(q);
  }
  function deleteCurrent() {
    if (!window.confirm("Apagar este orçamento inteiro (todas as opções)? Não dá pra desfazer.")) return;
    const rest = quotes.filter((q) => q.id !== quote.id);
    saveQuotes(rest);
    setSavedQuotes(rest);
    setQuote(rest[0] ?? newQuote(quote.defaults));
  }
  function duplicateCurrent() {
    setSavedQuotes(quotes);
    const copy = newQuote(quote.defaults);
    const variants = quote.variants.map((v) => ({ ...v, id: newQuoteItem().id, items: v.items.map((i) => ({ ...i, id: newQuoteItem().id })) }));
    setQuote({
      ...copy,
      customer: quote.customer,
      name: quote.name ? `${quote.name} (cópia)` : "",
      targetBudget: quote.targetBudget,
      notes: quote.notes,
      variants,
      activeVariantId: variants[0].id,
    });
  }

  // ---- saída -------------------------------------------------------------
  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("ok", `${label} copiado.`);
    } catch {
      notify("erro", "Não consegui copiar. Selecione o texto manualmente.");
    }
  }
  function downloadCsv() {
    const blob = new Blob([quoteToCsv(quote)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orcamento-${(quote.customer || quote.name || "upar").replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function sendToProposal() {
    setProposalHandoff({ productName: quote.name, rawSpecs: variantToPartsList(variant) });
    router.push("/");
  }

  const hasItems = items.length > 0;

  return (
    <div className="ws">
      {feedback && <div className={`toast ${feedback.kind === "ok" ? "toast-ok" : "toast-erro"}`}>{feedback.text}</div>}

      <header className="ws-head">
        <div className="ws-quote">
          <label className="ws-label" htmlFor="quotePicker">Orçamento</label>
          <div className="ws-quote-row">
            <select id="quotePicker" className="select" value={quote.id} onChange={(e) => selectQuote(e.target.value)}>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {(q.customer || q.name || "Sem nome") + (q.customer && q.name ? ` — ${q.name}` : "")} ·{" "}
                  {q.variants.length} opção(ões) · {new Date(q.updatedAt).toLocaleDateString("pt-BR")}
                </option>
              ))}
            </select>
            <button className="btn ghost" onClick={startNew}>Novo</button>
            <button className="btn ghost" onClick={duplicateCurrent}>Duplicar</button>
            <button className="btn ghost danger" onClick={deleteCurrent}>Apagar</button>
          </div>
        </div>
        <div className="ws-fields">
          <div className="fld">
            <label htmlFor="quoteCustomer">Cliente</label>
            <input id="quoteCustomer" value={quote.customer} onChange={(e) => update({ customer: e.target.value })} placeholder="Nome ou empresa" />
          </div>
          <div className="fld">
            <label htmlFor="quoteName">Máquina / projeto</label>
            <input id="quoteName" value={quote.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ex: Estação de edição 4K" />
          </div>
          <div className="fld fld-money">
            <label htmlFor="quoteTarget">Meta do cliente</label>
            <div className="money">
              <span>R$</span>
              <input
                id="quoteTarget"
                type="number"
                min={0}
                step={100}
                value={quote.targetBudget ?? ""}
                onChange={(e) => update({ targetBudget: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="10000"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="ws-tabs" role="tablist" aria-label="Opções de máquina">
        {quote.variants.map((v) => {
          const t = totalItems(v.items, quote.defaults);
          const active = v.id === variant.id;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={active}
              className={`tab ${active ? "active" : ""}`}
              onClick={() => update({ activeVariantId: v.id })}
              onDoubleClick={() => renameVariant(v.id)}
              title="Duplo clique para renomear"
            >
              <span className="tab-name">{v.name}</span>
              <span className="tab-total">{v.items.length ? formatBRL(t.price) : "vazia"}</span>
            </button>
          );
        })}
        <button className="tab tab-add" onClick={() => addVariant()} title="Nova opção em branco">+ Opção</button>
        <button className="tab tab-add" onClick={() => addVariant(variant)} title="Copia a opção atual para variar peças">+ Copiar esta</button>
        {quote.variants.length > 1 && (
          <span className="tab-tools">
            <button className="link-btn" onClick={() => renameVariant(variant.id)}>renomear</button>
            <button className="link-btn danger" onClick={() => removeVariant(variant.id)}>apagar opção</button>
          </span>
        )}
      </div>

      <div className="ws-body">
        <CatalogPane
          status={blingStatus}
          catalog={catalog}
          loading={catalogLoading || (Boolean(connected) && catalog == null && catalogError == null)}
          error={catalogError}
          picker={picker}
          replacingItem={picker.replaceItemId ? items.find((i) => i.id === picker.replaceItemId) ?? null : null}
          onPickerChange={setPicker}
          onPick={pickFromCatalog}
          onReload={reloadCatalog}
          onDisconnect={disconnectBling}
          onRefreshStock={refreshStock}
        />
        <BuildTable
          items={items}
          defaults={quote.defaults}
          onDefaultsChange={(defaults: PricingRates) => update({ defaults })}
          onResetDefaults={() => update({ defaults: { ...DEFAULT_RATES } })}
          picker={picker}
          connected={Boolean(connected)}
          onChoose={(slot, replaceItemId) => setPicker({ slot, replaceItemId })}
          onAddManual={(slot) => addItem({ category: slot })}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
        />
        <SummaryPane
          quote={quote}
          variant={variant}
          totals={totals}
          hasItems={hasItems}
          onApplyMarkup={(markupPct) => update({ defaults: { ...quote.defaults, markupPct } })}
          onSelectVariant={(id) => update({ activeVariantId: id })}
          onNotesChange={(notes) => update({ notes })}
          onCopyCustomer={() => copyText(variantToCustomerText(quote, variant), "Orçamento para o cliente")}
          onCopyInternal={() =>
            copyText(
              quote.variants.length > 1
                ? `${variantToInternalText(quote, variant)}\n\nComparativo:\n${quoteComparisonText(quote)}`
                : variantToInternalText(quote, variant),
              "Resumo interno"
            )
          }
          onDownloadCsv={downloadCsv}
          onSendToProposal={sendToProposal}
        />
      </div>
    </div>
  );
}
