"use client";

import { useEffect, useRef, useState } from "react";
import type { BlingProduct, BlingStatus } from "@/lib/bling-client";
import { formatBRL } from "@/lib/pricing";

type Props = {
  status: BlingStatus | null;
  onStatusChange: (update: (s: BlingStatus | null) => BlingStatus | null) => void;
  onAdd: (product: BlingProduct) => void;
  onRefreshStock: () => Promise<void>;
  hasBlingItems: boolean;
};

export default function BlingPanel({ status, onStatusChange, onAdd, onRefreshStock, hasBlingItems }: Props) {
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function disconnect() {
    await fetch("/api/bling/disconnect", { method: "POST" });
    onStatusChange((s) => (s ? { ...s, connected: false } : s));
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefreshStock();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="panel bling-panel">
      <div className="bling-row">
        <div>
          <h2>Bling</h2>
          <p className="field-hint">
            {status == null && "Verificando integração…"}
            {status && !status.configured &&
              "Integração não configurada no servidor (BLING_CLIENT_ID / BLING_CLIENT_SECRET)."}
            {status?.configured && !status.connected &&
              "Conecte sua conta do Bling para buscar produtos com estoque e preço de custo."}
            {status?.configured && status.connected && "Conectado. Monte o setup escolhendo do estoque abaixo, ou faça uma busca livre."}
          </p>
        </div>
        <div className="bling-actions">
          {status?.configured && !status.connected && (
            <a className="btn" href="/api/bling/auth">Conectar ao Bling</a>
          )}
          {status?.connected && (
            <>
              <button className="btn-secondary" onClick={() => setOpen(true)}>Busca livre</button>
              <button className="btn-secondary" onClick={refresh} disabled={!hasBlingItems || refreshing}>
                {refreshing ? "Atualizando…" : "Atualizar estoque"}
              </button>
              <button className="link-btn" onClick={disconnect}>desconectar</button>
            </>
          )}
        </div>
      </div>
      {open && (
        <BlingSearchModal
          onClose={() => setOpen(false)}
          onAdd={onAdd}
          onSessionLost={() => {
            onStatusChange((s) => (s ? { ...s, connected: false } : s));
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

function BlingSearchModal({
  onClose,
  onAdd,
  onSessionLost,
}: {
  onClose: () => void;
  onAdd: (p: BlingProduct) => void;
  onSessionLost: () => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<BlingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function search(nextPage = 1) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bling/produtos?q=${encodeURIComponent(q)}&pagina=${nextPage}`, {
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (res.status === 401) {
        onSessionLost();
        return;
      }
      if (!res.ok) throw new Error(data.error || "Erro na busca.");
      setResults(data.products as BlingProduct[]);
      setPage(nextPage);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro na busca.");
    } finally {
      setLoading(false);
    }
  }

  async function add(p: BlingProduct) {
    setAdding(p.id);
    try {
      // O custo só vem no detalhe do produto.
      let product = p;
      if (p.cost == null) {
        const res = await fetch(`/api/bling/produtos/${p.id}`);
        const data = await res.json();
        if (res.ok && data.product) {
          product = { ...p, ...(data.product as BlingProduct), stock: p.stock ?? data.product.stock };
        }
      }
      onAdd(product);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Buscar produto no Bling">
        <div className="modal-head">
          <h3>Buscar no Bling</h3>
          <button className="icon-btn" onClick={onClose} title="Fechar">×</button>
        </div>
        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            search(1);
          }}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome do produto (ex: SSD 1TB, RTX 4060, fonte 650W)"
          />
          <button className="btn" type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
        </form>
        {error && <div className="error-box">{error}</div>}
        <div className="results">
          {results.length === 0 && !loading && !error && (
            <div className="empty-state">Digite um termo e busque. Só aparecem produtos ativos.</div>
          )}
          {results.map((p) => {
            const stockCls = p.stock == null ? "stock-unknown" : p.stock <= 0 ? "stock-out" : "stock-ok";
            return (
              <div className="result-row" key={p.id}>
                <div className="result-main">
                  <div className="result-name">{p.name}</div>
                  <div className="result-meta">
                    {p.code && <span>Cód. {p.code}</span>}
                    <span className={`stock-badge ${stockCls}`}>
                      {p.stock == null ? "estoque ?" : `${p.stock} em estoque`}
                    </span>
                    {p.price != null && <span>venda Bling {formatBRL(p.price)}</span>}
                    {p.cost != null && <span>custo {formatBRL(p.cost)}</span>}
                  </div>
                </div>
                <button className="btn-secondary" onClick={() => add(p)} disabled={adding === p.id}>
                  {adding === p.id ? "…" : "Adicionar"}
                </button>
              </div>
            );
          })}
        </div>
        {results.length > 0 && (
          <div className="pager">
            <button className="btn-secondary" onClick={() => search(page - 1)} disabled={page <= 1 || loading}>← Anterior</button>
            <span>Página {page}</span>
            <button className="btn-secondary" onClick={() => search(page + 1)} disabled={results.length < 25 || loading}>Próxima →</button>
          </div>
        )}
      </div>
    </div>
  );
}
