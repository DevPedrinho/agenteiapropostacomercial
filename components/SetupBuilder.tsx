"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogProduct, CatalogResponse } from "@/lib/bling-client";
import { formatBRL, priceItem } from "@/lib/pricing";
import { SLOTS, type Slot } from "@/lib/slots";
import type { ItemCategory, PricingRates, QuoteItem } from "@/lib/quote-types";

export type Picker = { slot: ItemCategory; replaceItemId: string | null };

type Props = {
  items: QuoteItem[];
  defaults: PricingRates;
  /** null = ainda verificando; false = Bling não conectado/configurado. */
  connected: boolean | null;
  onPick: (product: CatalogProduct, slot: ItemCategory, replaceItemId: string | null) => Promise<void>;
  onAddManual: (slot: ItemCategory) => void;
  onUpdateItem: (id: string, patch: Partial<QuoteItem>) => void;
  onRemoveItem: (id: string) => void;
  onSessionLost: () => void;
};

function StockBadge({ stock, qty }: { stock: number | null | undefined; qty?: number }) {
  if (stock == null) return <span className="stock-badge stock-unknown">estoque ?</span>;
  const cls = stock <= 0 ? "stock-out" : qty != null && stock < qty ? "stock-low" : "stock-ok";
  return <span className={`stock-badge ${cls}`}>{stock} em estoque</span>;
}

export default function SetupBuilder({
  items,
  defaults,
  connected,
  onPick,
  onAddManual,
  onUpdateItem,
  onRemoveItem,
  onSessionLost,
}: Props) {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>({ slot: "Processador", replaceItemId: null });
  const [query, setQuery] = useState("");
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [picking, setPicking] = useState<number | null>(null);
  const [showExtras, setShowExtras] = useState(false);

  /** Busca o catálogo; devolve os dados ou lança. Não mexe em estado. */
  async function requestCatalog(refresh: boolean): Promise<CatalogResponse | "unauthorized"> {
    const res = await fetch(`/api/bling/catalogo${refresh ? "?refresh=1" : ""}`);
    const data = await res.json();
    if (res.status === 401) return "unauthorized";
    if (!res.ok) throw new Error(data.error || "Erro ao carregar o catálogo.");
    return data as CatalogResponse;
  }

  function applyCatalogResult(result: CatalogResponse | "unauthorized") {
    if (result === "unauthorized") {
      onSessionLost();
      return;
    }
    setCatalog(result);
    setError(null);
  }

  // Carrega o catálogo assim que o Bling estiver conectado. O estado só muda
  // dentro das callbacks da promise (nunca no corpo do efeito).
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    requestCatalog(false)
      .then((result) => {
        if (!cancelled) applyCatalogResult(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar o catálogo.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  function reload() {
    setRefreshing(true);
    requestCatalog(true)
      .then(applyCatalogResult)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar o catálogo."))
      .finally(() => setRefreshing(false));
  }

  const loading = Boolean(connected) && ((catalog == null && error == null) || refreshing);

  const bySlot = useMemo(() => {
    const map = new Map<ItemCategory, CatalogProduct[]>();
    for (const p of catalog?.products ?? []) {
      const list = map.get(p.slot) ?? [];
      list.push(p);
      map.set(p.slot, list);
    }
    return map;
  }, [catalog]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Busca por palavras: todas precisam aparecer no nome ou código, em qualquer ordem.
    const tokens = q.split(/\s+/).filter(Boolean);
    // Com busca digitada, procura no catálogo inteiro (a classificação por nome pode errar).
    const base = q ? (catalog?.products ?? []) : (bySlot.get(picker.slot) ?? []);
    return base
      .filter((p) => !onlyInStock || (p.stock ?? 0) > 0)
      .filter((p) => {
        if (tokens.length === 0) return true;
        const hay = `${p.name} ${p.code}`.toLowerCase();
        return tokens.every((t) => hay.includes(t));
      })
      .sort((a, b) => {
        // Com estoque primeiro, depois por nome.
        const sa = (a.stock ?? 0) > 0 ? 0 : 1;
        const sb = (b.stock ?? 0) > 0 ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name, "pt-BR");
      })
      .slice(0, 200);
  }, [catalog, bySlot, picker.slot, query, onlyInStock]);

  async function pick(p: CatalogProduct) {
    setPicking(p.id);
    try {
      await onPick(p, picker.slot, picker.replaceItemId);
      setPicker({ slot: picker.slot, replaceItemId: null });
    } finally {
      setPicking(null);
    }
  }

  const activeSlot = SLOTS.find((s) => s.id === picker.slot)!;
  const coreSlots = SLOTS.filter((s) => s.core);
  const extraSlots = SLOTS.filter((s) => !s.core);
  const extrasCount = items.filter((i) => extraSlots.some((s) => s.id === i.category)).length;

  return (
    <section className="panel setup-panel">
      <div className="panel-title-row">
        <h2>Montar setup</h2>
        <div className="catalog-status">
          {connected === false && <span className="field-hint">Conecte o Bling para escolher do estoque.</span>}
          {connected && loading && <span className="field-hint">Carregando estoque do Bling…</span>}
          {connected && !loading && catalog && (
            <>
              <span className="field-hint">
                {catalog.total} produtos ativos · {new Date(catalog.fetchedAt).toLocaleTimeString("pt-BR")}
                {catalog.truncated ? " · catálogo cortado no limite" : ""}
              </span>
              <button className="link-btn" onClick={reload}>recarregar</button>
            </>
          )}
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}

      <div className="setup-grid">
        <div className="slots-col">
          {coreSlots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              items={items.filter((i) => i.category === slot.id)}
              defaults={defaults}
              active={picker.slot === slot.id}
              replacing={picker.slot === slot.id ? picker.replaceItemId : null}
              available={(bySlot.get(slot.id) ?? []).filter((p) => (p.stock ?? 0) > 0).length}
              connected={Boolean(connected)}
              onChoose={(replaceItemId) => {
                setPicker({ slot: slot.id, replaceItemId });
                setQuery("");
              }}
              onAddManual={() => onAddManual(slot.id)}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
          <button className="btn-secondary extras-toggle" onClick={() => setShowExtras((v) => !v)}>
            {showExtras ? "− Extras" : `+ Extras`}
            {extrasCount > 0 ? ` (${extrasCount})` : ""}
          </button>
          {showExtras &&
            extraSlots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                items={items.filter((i) => i.category === slot.id)}
                defaults={defaults}
                active={picker.slot === slot.id}
                replacing={picker.slot === slot.id ? picker.replaceItemId : null}
                available={(bySlot.get(slot.id) ?? []).filter((p) => (p.stock ?? 0) > 0).length}
                connected={Boolean(connected)}
                onChoose={(replaceItemId) => {
                  setPicker({ slot: slot.id, replaceItemId });
                  setQuery("");
                }}
                onAddManual={() => onAddManual(slot.id)}
                onUpdateItem={onUpdateItem}
                onRemoveItem={onRemoveItem}
              />
            ))}
        </div>

        <div className="catalog-col">
          <div className="catalog-head">
            <h3>
              {activeSlot.icon} {activeSlot.label}
              {picker.replaceItemId ? <span className="catalog-mode"> · trocando</span> : null}
            </h3>
            <label className="check">
              <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} />
              só com estoque
            </label>
          </div>
          <input
            className="catalog-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filtrar ${activeSlot.label.toLowerCase()}… (digitando, busca no catálogo inteiro)`}
            disabled={!catalog}
          />
          <div className="catalog-list">
            {!connected && (
              <div className="empty-state">
                Sem o Bling, use “+ manual” em cada peça e preencha nome e custo na planilha abaixo.
              </div>
            )}
            {connected && !loading && catalog && candidates.length === 0 && (
              <div className="empty-state">
                Nada {onlyInStock ? "com estoque " : ""}nesse slot. Tente a busca ou desmarque “só com estoque”.
              </div>
            )}
            {candidates.map((p) => (
              <div className="catalog-row" key={p.id}>
                <div className="result-main">
                  <div className="result-name">{p.name}</div>
                  <div className="result-meta">
                    {p.code && <span>Cód. {p.code}</span>}
                    <StockBadge stock={p.stock} />
                    {p.price != null && <span>venda Bling {formatBRL(p.price)}</span>}
                    {query && p.slot !== picker.slot && <span className="catalog-other">classificado como {p.slot}</span>}
                  </div>
                </div>
                <button className="btn" onClick={() => pick(p)} disabled={picking === p.id}>
                  {picking === p.id ? "…" : picker.replaceItemId ? "Trocar" : "Usar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SlotCard({
  slot,
  items,
  defaults,
  active,
  replacing,
  available,
  connected,
  onChoose,
  onAddManual,
  onUpdateItem,
  onRemoveItem,
}: {
  slot: Slot;
  items: QuoteItem[];
  defaults: PricingRates;
  active: boolean;
  replacing: string | null;
  available: number;
  connected: boolean;
  onChoose: (replaceItemId: string | null) => void;
  onAddManual: () => void;
  onUpdateItem: (id: string, patch: Partial<QuoteItem>) => void;
  onRemoveItem: (id: string) => void;
}) {
  const empty = items.length === 0;
  return (
    <div className={`slot-card ${active ? "active" : ""} ${empty ? "empty" : ""}`}>
      <div className="slot-head">
        <span className="slot-title">
          <span className="slot-icon">{slot.icon}</span> {slot.label}
        </span>
        <span className="slot-actions">
          {connected && (
            <span className="slot-available" title="Produtos com estoque nesse slot">{available} disp.</span>
          )}
          {connected && (
            <button className="btn-secondary btn-small" onClick={() => onChoose(null)}>
              {empty ? "Escolher" : "+ outro"}
            </button>
          )}
          <button className="btn-secondary btn-small" onClick={onAddManual} title="Adicionar linha manual">
            + manual
          </button>
        </span>
      </div>
      {empty && slot.hint && <div className="slot-hint">{slot.hint}</div>}
      {items.map((item) => {
        const p = priceItem(item, defaults);
        return (
          <div className={`slot-item ${replacing === item.id ? "replacing" : ""}`} key={item.id}>
            <div className="slot-item-main">
              <div className="slot-item-name">{item.name || <em>sem nome</em>}</div>
              <div className="result-meta">
                {item.blingCode && <span>Cód. {item.blingCode}</span>}
                {item.blingProductId ? <StockBadge stock={item.stock} qty={item.qty} /> : <span>manual</span>}
                <span>custo {formatBRL(item.cost)}</span>
                {item.cost === 0 && <span className="target-over">preencha o custo</span>}
              </div>
            </div>
            <div className="slot-item-side">
              <div className="slot-qty">
                <button className="icon-btn" onClick={() => onUpdateItem(item.id, { qty: Math.max(1, item.qty - 1) })} title="Menos">−</button>
                <span>{item.qty}</span>
                <button className="icon-btn" onClick={() => onUpdateItem(item.id, { qty: item.qty + 1 })} title="Mais">+</button>
              </div>
              <div className="slot-price">{formatBRL(p.price)}</div>
              <div className="slot-item-actions">
                {connected && item.blingProductId && (
                  <button className="link-btn" onClick={() => onChoose(item.id)}>trocar</button>
                )}
                <button className="btn-remove" onClick={() => onRemoveItem(item.id)} title="Remover">×</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
