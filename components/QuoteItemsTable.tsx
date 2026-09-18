"use client";

import { formatBRL, formatPct, priceItem } from "@/lib/pricing";
import { ITEM_CATEGORIES, type PricingRates, type QuoteItem } from "@/lib/quote-types";

type Props = {
  items: QuoteItem[];
  defaults: PricingRates;
  onChange: (id: string, patch: Partial<QuoteItem>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
};

const RATE_COLUMNS: { key: keyof PricingRates; label: string }[] = [
  { key: "inboundTaxPct", label: "Entrada %" },
  { key: "markupPct", label: "Markup %" },
  { key: "cetPct", label: "CET %" },
  { key: "outboundTaxPct", label: "Saída %" },
];

function StockBadge({ item }: { item: QuoteItem }) {
  if (!item.blingProductId) return null;
  if (item.stock == null) return <span className="stock-badge stock-unknown" title="Estoque não informado">?</span>;
  const enough = item.stock >= item.qty;
  const cls = item.stock <= 0 ? "stock-out" : enough ? "stock-ok" : "stock-low";
  const when = item.stockCheckedAt ? new Date(item.stockCheckedAt).toLocaleString("pt-BR") : "";
  return (
    <span className={`stock-badge ${cls}`} title={`Saldo virtual no Bling${when ? ` em ${when}` : ""}`}>
      {item.stock} em estoque
    </span>
  );
}

export default function QuoteItemsTable({ items, defaults, onChange, onRemove, onMove }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="table-scroll">
      <table className="items-table">
        <thead>
          <tr>
            <th className="col-cat">Categoria</th>
            <th className="col-name">Item / link</th>
            <th className="col-qty">Qtd</th>
            <th className="col-money">Custo un.</th>
            {RATE_COLUMNS.map((c) => (
              <th key={c.key} className="col-pct">{c.label}</th>
            ))}
            <th className="col-money">Preço un.</th>
            <th className="col-money">Total</th>
            <th className="col-money">Lucro</th>
            <th className="col-actions"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const p = priceItem(item, defaults);
            return (
              <tr key={item.id}>
                <td className="col-cat">
                  <select value={item.category} onChange={(e) => onChange(item.id, { category: e.target.value as QuoteItem["category"] })}>
                    {ITEM_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </td>
                <td className="col-name">
                  <input
                    value={item.name}
                    onChange={(e) => onChange(item.id, { name: e.target.value })}
                    placeholder="Nome da peça"
                    aria-label="Nome do item"
                  />
                  <div className="link-row">
                    <input
                      value={item.link}
                      onChange={(e) => onChange(item.id, { link: e.target.value })}
                      placeholder="Link do produto (fornecedor)"
                      aria-label="Link do produto"
                    />
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="link-open" title="Abrir link">
                        ↗
                      </a>
                    )}
                  </div>
                  <div className="item-meta">
                    {item.blingCode && <span className="item-code">Bling {item.blingCode}</span>}
                    <StockBadge item={item} />
                  </div>
                </td>
                <td className="col-qty">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={item.qty}
                    onChange={(e) => onChange(item.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
                    aria-label="Quantidade"
                  />
                </td>
                <td className="col-money">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.cost}
                    onChange={(e) => onChange(item.id, { cost: Math.max(0, Number(e.target.value) || 0) })}
                    aria-label="Custo unitário"
                  />
                </td>
                {RATE_COLUMNS.map((c) => (
                  <td key={c.key} className="col-pct">
                    <input
                      type="number"
                      step={0.1}
                      value={item[c.key] ?? ""}
                      placeholder={String(defaults[c.key])}
                      onChange={(e) =>
                        onChange(item.id, { [c.key]: e.target.value === "" ? null : Number(e.target.value) })
                      }
                      className={item[c.key] == null ? "is-default" : "is-override"}
                      aria-label={c.label}
                    />
                  </td>
                ))}
                <td className="col-money num">{formatBRL(p.unitPrice)}</td>
                <td className="col-money num strong">{formatBRL(p.price)}</td>
                <td className="col-money num">
                  {formatBRL(p.profit)}
                  <div className="cell-sub">{formatPct(p.marginPct * 100)}</div>
                </td>
                <td className="col-actions">
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => onMove(item.id, -1)} disabled={idx === 0} title="Subir">↑</button>
                    <button className="icon-btn" onClick={() => onMove(item.id, 1)} disabled={idx === items.length - 1} title="Descer">↓</button>
                    <button className="btn-remove" onClick={() => onRemove(item.id)} title="Remover">×</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
