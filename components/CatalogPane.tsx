"use client";

import { useMemo, useState } from "react";
import type { BlingProduct, BlingStatus, CatalogProduct, CatalogResponse } from "@/lib/bling-client";
import { formatBRL } from "@/lib/pricing";
import { SLOTS } from "@/lib/slots";
import type { QuoteItem } from "@/lib/quote-types";
import type { Picker } from "./QuoteWorkspace";

type Props = {
  status: BlingStatus | null;
  catalog: CatalogResponse | null;
  loading: boolean;
  error: string | null;
  picker: Picker;
  replacingItem: QuoteItem | null;
  onPickerChange: (p: Picker) => void;
  onPick: (p: CatalogProduct | BlingProduct) => Promise<void>;
  onReload: () => void;
  onDisconnect: () => void;
  onRefreshStock: () => void;
};

export function StockBadge({ stock, qty }: { stock: number | null | undefined; qty?: number }) {
  if (stock == null) return <span className="badge muted">estoque ?</span>;
  const cls = stock <= 0 ? "bad" : qty != null && stock < qty ? "warn" : "ok";
  return <span className={`badge ${cls}`}>{stock} un.</span>;
}

export default function CatalogPane({
  status,
  catalog,
  loading,
  error,
  picker,
  replacingItem,
  onPickerChange,
  onPick,
  onReload,
  onDisconnect,
  onRefreshStock,
}: Props) {
  const [query, setQuery] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [picking, setPicking] = useState<number | null>(null);
  const [apiResults, setApiResults] = useState<BlingProduct[] | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const slot = SLOTS.find((s) => s.id === picker.slot)!;
  const connected = Boolean(status?.connected);

  const candidates = useMemo(() => {
    const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const all = catalog?.products ?? [];
    // Sem busca: só o slot ativo. Com busca: catálogo inteiro (a classificação pode errar).
    const base = tokens.length ? all : all.filter((p) => p.slot === picker.slot);
    return base
      .filter((p) => !onlyInStock || (p.stock ?? 0) > 0)
      .filter((p) => {
        if (!tokens.length) return true;
        const hay = `${p.name} ${p.code}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .sort((a, b) => {
        const sa = (a.stock ?? 0) > 0 ? 0 : 1;
        const sb = (b.stock ?? 0) > 0 ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 200);
  }, [catalog, picker.slot, query, onlyInStock]);

  async function pick(p: CatalogProduct | BlingProduct) {
    setPicking(p.id);
    try {
      await onPick(p);
    } finally {
      setPicking(null);
    }
  }

  async function searchApi() {
    setApiLoading(true);
    try {
      const res = await fetch(`/api/bling/produtos?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setApiResults(res.ok ? (data.products as BlingProduct[]) : []);
    } catch {
      setApiResults([]);
    } finally {
      setApiLoading(false);
    }
  }

  function changeQuery(v: string) {
    setQuery(v);
    setApiResults(null);
  }

  const countInSlot = (id: string) => (catalog?.products ?? []).filter((p) => p.slot === id && (p.stock ?? 0) > 0).length;

  return (
    <aside className="pane catalog">
      <div className="pane-head">
        <div className="bling-status">
          <span className={`dot ${status == null ? "" : connected ? "on" : status.configured ? "off" : "na"}`} />
          <div className="bling-status-text">
            <strong>Estoque Bling</strong>
            <span>
              {status == null && "verificando…"}
              {status && !status.configured && "não configurado no servidor"}
              {status?.configured && !connected && "não conectado"}
              {connected && loading && "carregando produtos…"}
              {connected && !loading && catalog && `${catalog.total} produtos · ${new Date(catalog.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
          {status?.configured && !connected && (
            <a className="btn primary sm" href="/api/bling/auth">Conectar</a>
          )}
          {status && !status.configured && (
            <a className="link-btn" href="/api/bling/diagnostico" target="_blank" rel="noopener noreferrer">diagnóstico</a>
          )}
          {connected && (
            <div className="bling-tools">
              <button className="icon-btn" onClick={onReload} title="Recarregar estoque" disabled={loading}>↻</button>
              <details className="menu">
                <summary className="icon-btn" title="Mais">⋯</summary>
                <div className="menu-list">
                  <button onClick={onRefreshStock}>Atualizar estoque das peças escolhidas</button>
                  <a href="/api/bling/diagnostico" target="_blank" rel="noopener noreferrer">Diagnóstico da integração</a>
                  <button onClick={onDisconnect}>Desconectar do Bling</button>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="catalog-target">
        {replacingItem ? (
          <>
            <span>
              Trocando <strong>{replacingItem.name || "peça"}</strong>
            </span>
            <button className="link-btn" onClick={() => onPickerChange({ slot: picker.slot, replaceItemId: null })}>cancelar</button>
          </>
        ) : (
          <span>
            Adicionando em <strong>{slot.icon} {slot.label}</strong>
          </span>
        )}
      </div>

      <input
        className="input search"
        value={query}
        onChange={(e) => changeQuery(e.target.value)}
        placeholder="Buscar por nome ou código…"
        disabled={!catalog}
        aria-label="Buscar no estoque"
      />

      <div className="chips">
        {SLOTS.map((s) => (
          <button
            key={s.id}
            className={`chip ${picker.slot === s.id ? "active" : ""}`}
            onClick={() => onPickerChange({ slot: s.id, replaceItemId: null })}
            title={s.label}
          >
            {s.icon} {s.label}
            {catalog && <span className="chip-count">{countInSlot(s.id)}</span>}
          </button>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
        só com estoque
      </label>

      <div className="catalog-list">
        {!connected && status && (
          <div className="empty">
            {status.configured
              ? "Conecte o Bling para escolher as peças do estoque. Sem ele, use “+ manual” na montagem."
              : "Defina BLING_CLIENT_ID e BLING_CLIENT_SECRET no servidor para ligar o estoque."}
          </div>
        )}
        {connected && loading && <div className="empty">Carregando estoque…</div>}
        {connected && !loading && catalog && candidates.length === 0 && !apiResults && (
          <div className="empty">
            Nada {onlyInStock ? "com estoque " : ""}
            {query ? "para essa busca" : `em ${slot.label.toLowerCase()}`}.
            {query && (
              <>
                {" "}
                <button className="link-btn" onClick={searchApi} disabled={apiLoading}>
                  {apiLoading ? "buscando…" : "buscar direto no Bling"}
                </button>
              </>
            )}
          </div>
        )}
        {(apiResults ?? candidates).map((p) => {
          const other: string | null =
            query.trim() && "slot" in p && (p as CatalogProduct).slot !== picker.slot ? (p as CatalogProduct).slot : null;
          return (
            <button className="prod" key={p.id} onClick={() => pick(p)} disabled={picking === p.id}>
              <span className="prod-name">{p.name}</span>
              <span className="prod-meta">
                <StockBadge stock={p.stock} />
                {p.code && <span className="code">{p.code}</span>}
                {p.price != null && <span>venda {formatBRL(p.price)}</span>}
                {other && <span className="other">→ {other}</span>}
              </span>
              <span className="prod-add">{picking === p.id ? "…" : replacingItem ? "Trocar" : "+"}</span>
            </button>
          );
        })}
        {apiResults && apiResults.length === 0 && <div className="empty">Nada encontrado no Bling.</div>}
        {catalog?.truncated && <div className="empty small">Catálogo cortado no limite de 4.000 produtos.</div>}
      </div>
    </aside>
  );
}
