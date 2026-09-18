"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuoteItemsTable from "./QuoteItemsTable";
import QuoteSummary from "./QuoteSummary";
import BlingPanel from "./BlingPanel";
import SetupBuilder from "./SetupBuilder";
import { totalQuote } from "@/lib/pricing";
import {
  loadCurrentQuoteId,
  loadQuotes,
  saveCurrentQuoteId,
  saveQuotes,
  setProposalHandoff,
} from "@/lib/quote-storage";
import { quoteToCsv, quoteToCustomerText, quoteToInternalText, quoteToPartsList } from "@/lib/quote-export";
import {
  DEFAULT_RATES,
  newQuote,
  newQuoteItem,
  type PricingRates,
  type Quote,
  type QuoteItem,
} from "@/lib/quote-types";
import type { BlingProduct, BlingStatus, CatalogProduct } from "@/lib/bling-client";
import type { ItemCategory } from "@/lib/quote-types";

type Feedback = { kind: "ok" | "erro"; text: string } | null;

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
  if (result.status === "ok") return { kind: "ok", text: "Bling conectado. Já dá pra buscar produtos e estoque." };
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
  const [blingStatus, setBlingStatus] = useState<BlingStatus | null>(null);

  useEffect(() => {
    fetch("/api/bling/status")
      .then((r) => r.json())
      .then((st: BlingStatus) => setBlingStatus(st))
      .catch(() => setBlingStatus({ configured: false, connected: false }));
  }, []);
  const feedbackTimer = useRef<number | null>(null);

  // Limpa ?bling=… da URL depois de mostrar o aviso.
  useEffect(() => {
    if (blingResult) router.replace("/orcamento");
  }, [blingResult, router]);

  // Autosave: qualquer mudança no orçamento atual vai pro localStorage.
  useEffect(() => {
    saveQuotes(upsert(loadQuotes(), quote));
    saveCurrentQuoteId(quote.id);
  }, [quote]);

  // Lista do seletor: os salvos + o atual (que pode ainda não ter sido gravado).
  const quotes = useMemo(() => upsert(savedQuotes, quote), [savedQuotes, quote]);

  function notify(kind: "ok" | "erro", text: string) {
    setFeedback({ kind, text });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 4000);
  }

  const update = useCallback((patch: Partial<Quote>) => {
    setQuote((q) => ({ ...q, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const totals = useMemo(() => totalQuote(quote), [quote]);

  // ---- itens -------------------------------------------------------------
  function addItem(partial: Partial<QuoteItem> = {}) {
    update({ items: [...quote.items, newQuoteItem(partial)] });
  }
  function updateItem(id: string, patch: Partial<QuoteItem>) {
    update({ items: quote.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  }
  function removeItem(id: string) {
    update({ items: quote.items.filter((i) => i.id !== id) });
  }
  function moveItem(id: string, dir: -1 | 1) {
    const idx = quote.items.findIndex((i) => i.id === id);
    const to = idx + dir;
    if (idx === -1 || to < 0 || to >= quote.items.length) return;
    const items = quote.items.slice();
    [items[idx], items[to]] = [items[to], items[idx]];
    update({ items });
  }

  function addFromBling(product: BlingProduct, category?: ItemCategory, replaceItemId: string | null = null) {
    const patch: Partial<QuoteItem> = {
      name: product.name,
      cost: product.cost ?? 0,
      blingProductId: product.id,
      blingCode: product.code || undefined,
      stock: product.stock,
      stockCheckedAt: new Date().toISOString(),
    };
    if (replaceItemId && quote.items.some((i) => i.id === replaceItemId)) {
      updateItem(replaceItemId, patch);
    } else {
      addItem({ ...patch, category: category ?? ("slot" in product ? (product as CatalogProduct).slot : "Outro") });
    }
    if (product.cost == null) {
      notify("erro", `“${product.name}” não tem preço de custo no Bling — preencha o custo na linha.`);
    } else {
      notify("ok", `“${product.name}” adicionado com custo ${product.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`);
    }
  }

  /** Escolha no montador: busca o detalhe (custo) e adiciona/troca no slot. */
  async function pickFromCatalog(product: CatalogProduct, slot: ItemCategory, replaceItemId: string | null) {
    let full: BlingProduct = product;
    if (product.cost == null) {
      try {
        const res = await fetch(`/api/bling/produtos/${product.id}`);
        const data = await res.json();
        if (res.ok && data.product) full = { ...product, ...(data.product as BlingProduct), stock: product.stock ?? data.product.stock };
      } catch {
        // segue sem custo; o aviso abaixo cobre
      }
    }
    addFromBling(full, slot, replaceItemId);
  }

  async function refreshStock() {
    const ids = quote.items.map((i) => i.blingProductId).filter((n): n is number => typeof n === "number");
    if (ids.length === 0) {
      notify("erro", "Nenhum item veio do Bling. Use “Buscar no Bling” para adicionar com estoque.");
      return;
    }
    try {
      const res = await fetch(`/api/bling/estoque?ids=${ids.join(",")}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao consultar estoque.");
      const byId = new Map<number, { virtual: number | null; physical: number | null }>(
        (data.balances as { productId: number; virtual: number | null; physical: number | null }[]).map((b) => [
          b.productId,
          b,
        ])
      );
      update({
        items: quote.items.map((i) =>
          i.blingProductId && byId.has(i.blingProductId)
            ? { ...i, stock: byId.get(i.blingProductId)!.virtual, stockCheckedAt: data.checkedAt }
            : i
        ),
      });
      notify("ok", "Estoque atualizado.");
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
    if (!window.confirm("Apagar este orçamento? Não dá pra desfazer.")) return;
    const rest = quotes.filter((q) => q.id !== quote.id);
    saveQuotes(rest);
    setSavedQuotes(rest);
    setQuote(rest[0] ?? newQuote(quote.defaults));
  }
  function duplicateCurrent() {
    setSavedQuotes(quotes);
    const copy = newQuote(quote.defaults);
    setQuote({
      ...copy,
      name: quote.name ? `${quote.name} (cópia)` : "",
      customer: quote.customer,
      targetBudget: quote.targetBudget,
      notes: quote.notes,
      items: quote.items.map((i) => ({ ...i, id: newQuoteItem().id })),
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
    a.download = `orcamento-${(quote.name || quote.customer || "upar").replace(/[^\w-]+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function sendToProposal() {
    setProposalHandoff({ productName: quote.name, rawSpecs: quoteToPartsList(quote) });
    router.push("/");
  }

  const hasItems = quote.items.length > 0;

  return (
    <div className="quote-layout">
      {feedback && <div className={feedback.kind === "ok" ? "toast toast-ok" : "toast toast-erro"}>{feedback.text}</div>}

      <section className="panel quote-header-panel">
        <div className="quote-toolbar">
          <div className="quote-picker">
            <label htmlFor="quotePicker">Orçamento</label>
            <select id="quotePicker" value={quote.id} onChange={(e) => selectQuote(e.target.value)}>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name || q.customer || "Sem nome"} — {q.items.length} item(ns) —{" "}
                  {new Date(q.updatedAt).toLocaleDateString("pt-BR")}
                </option>
              ))}
            </select>
          </div>
          <div className="quote-toolbar-actions">
            <button className="btn-secondary" onClick={startNew}>+ Novo</button>
            <button className="btn-secondary" onClick={duplicateCurrent} disabled={!hasItems}>Duplicar</button>
            <button className="btn-secondary btn-danger" onClick={deleteCurrent}>Apagar</button>
          </div>
        </div>

        <div className="quote-meta-grid">
          <div className="field">
            <label htmlFor="quoteName">Nome do orçamento / máquina</label>
            <input
              id="quoteName"
              value={quote.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Ex: UPAR ENTERPRISE i5 14400F"
            />
          </div>
          <div className="field">
            <label htmlFor="quoteCustomer">Cliente</label>
            <input
              id="quoteCustomer"
              value={quote.customer}
              onChange={(e) => update({ customer: e.target.value })}
              placeholder="Nome ou empresa"
            />
          </div>
          <div className="field">
            <label htmlFor="quoteTarget">Meta do cliente (R$)</label>
            <input
              id="quoteTarget"
              type="number"
              min={0}
              step={100}
              value={quote.targetBudget ?? ""}
              onChange={(e) => update({ targetBudget: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="Ex: 10000"
            />
          </div>
        </div>

        <RatesEditor
          rates={quote.defaults}
          onChange={(defaults) => update({ defaults })}
          onReset={() => update({ defaults: { ...DEFAULT_RATES } })}
        />
      </section>

      <BlingPanel
        status={blingStatus}
        onStatusChange={setBlingStatus}
        onAdd={(p) => addFromBling(p)}
        onRefreshStock={refreshStock}
        hasBlingItems={quote.items.some((i) => i.blingProductId)}
      />

      <SetupBuilder
        items={quote.items}
        defaults={quote.defaults}
        connected={blingStatus == null ? null : Boolean(blingStatus.connected)}
        onPick={pickFromCatalog}
        onAddManual={(slot) => addItem({ category: slot })}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onSessionLost={() => setBlingStatus((st) => (st ? { ...st, connected: false } : st))}
      />

      <details className="panel details-panel" open={!blingStatus?.connected && hasItems}>
        <summary>
          <span>Planilha detalhada</span>
          <span className="field-hint">
            custo, link, imposto de entrada, markup, CET e imposto de saída por item · {quote.items.length} item(ns)
          </span>
        </summary>
        <div className="panel-title-row details-actions">
          <span />
          <button className="btn-secondary" onClick={() => addItem()}>+ Item manual</button>
        </div>
        <QuoteItemsTable
          items={quote.items}
          defaults={quote.defaults}
          onChange={updateItem}
          onRemove={removeItem}
          onMove={moveItem}
        />
        {!hasItems && (
          <div className="empty-state">
            Nenhum item ainda. Escolha as peças no montador acima ou adicione uma linha manual.
          </div>
        )}
      </details>

      <QuoteSummary
        quote={quote}
        totals={totals}
        onApplyMarkup={(markup) => update({ defaults: { ...quote.defaults, markupPct: markup } })}
      />

      <section className="panel">
        <h2>Saída</h2>
        <div className="field">
          <label htmlFor="quoteNotes">Observações para o cliente (prazo, garantia, forma de pagamento…)</label>
          <textarea
            id="quoteNotes"
            rows={3}
            value={quote.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Ex: Garantia de 12 meses. Entrega em até 5 dias úteis. Parcelamos em até 10x."
          />
        </div>
        <div className="output-actions wrap">
          <button className="btn" onClick={() => copyText(quoteToCustomerText(quote), "Orçamento para o cliente")} disabled={!hasItems}>
            Copiar p/ cliente
          </button>
          <button className="btn-secondary" onClick={() => copyText(quoteToInternalText(quote), "Resumo interno")} disabled={!hasItems}>
            Copiar resumo interno
          </button>
          <button className="btn-secondary" onClick={downloadCsv} disabled={!hasItems}>
            Baixar CSV (planilha)
          </button>
          <button className="btn-secondary" onClick={sendToProposal} disabled={!hasItems}>
            Gerar ficha de produto →
          </button>
        </div>
        <p className="copy-hint">
          “Copiar p/ cliente” sai só com item e preço de venda, sem custo nem margem. O CSV traz
          todas as colunas internas e abre direto no Excel.
        </p>
      </section>
    </div>
  );
}

function RatesEditor({
  rates,
  onChange,
  onReset,
}: {
  rates: PricingRates;
  onChange: (r: PricingRates) => void;
  onReset: () => void;
}) {
  const fields: { key: keyof PricingRates; label: string; hint: string }[] = [
    { key: "inboundTaxPct", label: "Imposto de entrada %", hint: "Sobre o custo de compra" },
    { key: "markupPct", label: "Markup %", hint: "Sobre o custo com entrada" },
    { key: "cetPct", label: "CET %", hint: "Taxa do cartão / parcelamento, sobre a venda" },
    { key: "outboundTaxPct", label: "Imposto de saída %", hint: "Sobre o preço de venda" },
  ];
  return (
    <div className="rates-editor">
      <div className="rates-title">
        <span>Padrões do orçamento</span>
        <button className="link-btn" onClick={onReset} type="button">restaurar</button>
      </div>
      <div className="rates-grid">
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`rate-${f.key}`}>{f.label}</label>
            <input
              id={`rate-${f.key}`}
              type="number"
              step={0.1}
              value={rates[f.key]}
              onChange={(e) => onChange({ ...rates, [f.key]: Number(e.target.value) || 0 })}
            />
            <p className="field-hint">{f.hint}</p>
          </div>
        ))}
      </div>
      <p className="field-hint">
        Preço = custo × (1 + entrada) × (1 + markup) ÷ (1 − saída − CET). Cada item pode
        sobrescrever qualquer percentual; em branco usa o padrão.
      </p>
    </div>
  );
}
