"use client";

import { useState } from "react";
import { formatBRL, formatMultiplier, priceItem } from "@/lib/pricing";
import { SLOTS, SLOT_BY_ID } from "@/lib/slots";
import {
  ITEM_CATEGORIES,
  markupToMultiplier,
  parseMarkupInput,
  type ItemCategory,
  type PricingRates,
  type QuoteItem,
} from "@/lib/quote-types";
import { StockBadge } from "./CatalogPane";
import type { Picker } from "./QuoteWorkspace";

type Props = {
  items: QuoteItem[];
  defaults: PricingRates;
  onDefaultsChange: (d: PricingRates) => void;
  onResetDefaults: () => void;
  picker: Picker;
  connected: boolean;
  onChoose: (slot: ItemCategory, replaceItemId: string | null) => void;
  onAddManual: (slot: ItemCategory) => void;
  onUpdateItem: (id: string, patch: Partial<QuoteItem>) => void;
  onRemoveItem: (id: string) => void;
};

/** Campo de markup no formato da planilha (×1,35). Aceita "1,35" ou "35". */
function MarkupInput({
  value,
  placeholderPct,
  onCommit,
}: {
  value: number | null;
  placeholderPct: number;
  onCommit: (pct: number | null) => void;
}) {
  const shown = value == null ? "" : markupToMultiplier(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const [text, setText] = useState(shown);
  const [prev, setPrev] = useState(shown);
  if (shown !== prev) {
    setPrev(shown);
    setText(shown);
  }
  return (
    <input
      className={`cell num ${value == null ? "is-default" : "is-override"}`}
      value={text}
      placeholder={markupToMultiplier(placeholderPct).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(parseMarkupInput(text))}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      inputMode="decimal"
      aria-label="Markup"
      title="Markup como na planilha: 1,35 = +35%. Vazio usa o padrão."
    />
  );
}

function PctInput({
  value,
  placeholder,
  label,
  onChange,
}: {
  value: number | null;
  placeholder: number;
  label: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <input
      className={`cell num ${value == null ? "is-default" : "is-override"}`}
      type="number"
      step={0.01}
      value={value ?? ""}
      placeholder={String(placeholder)}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      aria-label={label}
      title={`${label}. Vazio usa o padrão.`}
    />
  );
}

export default function BuildTable({
  items,
  defaults,
  onDefaultsChange,
  onResetDefaults,
  picker,
  connected,
  onChoose,
  onAddManual,
  onUpdateItem,
  onRemoveItem,
}: Props) {
  const [extraSlot, setExtraSlot] = useState<ItemCategory>("Monitor");
  const core = SLOTS.filter((s) => s.core);
  const extras = SLOTS.filter((s) => !s.core);
  const extraItems = items.filter((i) => extras.some((s) => s.id === i.category));

  function editLink(item: QuoteItem) {
    const link = window.prompt("Link do produto no fornecedor", item.link);
    if (link != null) onUpdateItem(item.id, { link: link.trim() });
  }

  // A coluna de imposto de saída só aparece quando entra na conta (a planilha não tem).
  const showOutbound = defaults.outboundTaxPct > 0 || items.some((i) => i.outboundTaxPct != null);

  function renderItem(item: QuoteItem) {
    const p = priceItem(item, defaults);
    const slot = SLOT_BY_ID.get(item.category)!;
    const replacing = picker.replaceItemId === item.id;
    return (
      <tr key={item.id} className={`row ${replacing ? "replacing" : ""}`}>
        <td className="c-prod">
          <span className="slot-tag" title={slot.label}>
            <span className="slot-icon">{slot.icon}</span>
            <span className="slot-name">{slot.label}</span>
          </span>
          <input
            className="cell name"
            value={item.name}
            onChange={(e) => onUpdateItem(item.id, { name: e.target.value })}
            placeholder="Nome da peça"
            aria-label="Nome da peça"
          />
          <div className="prod-sub">
            <input
              className="cell sub"
              value={item.supplier}
              onChange={(e) => onUpdateItem(item.id, { supplier: e.target.value })}
              placeholder="Fornecedor"
              aria-label="Fornecedor"
              list="suppliers"
            />
            {item.link ? (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="link-open" title={item.link}>↗ link</a>
            ) : null}
            <button className="link-btn subtle" onClick={() => editLink(item)} title="Link do produto no fornecedor">
              {item.link ? "editar link" : "+ link"}
            </button>
            {item.blingProductId && (
              <>
                <StockBadge stock={item.stock} qty={item.qty} />
                {item.blingCode && <span className="code">{item.blingCode}</span>}
              </>
            )}
          </div>
        </td>
        <td className="c-qty">
          <input
            className="cell num"
            type="number"
            min={0}
            step={1}
            value={item.qty}
            onChange={(e) => onUpdateItem(item.id, { qty: Math.max(0, Number(e.target.value) || 0) })}
            aria-label="Quantidade"
          />
        </td>
        <td className="c-money">
          <input
            className={`cell num ${item.cost === 0 ? "is-missing" : ""}`}
            type="number"
            min={0}
            step={0.01}
            value={item.cost}
            onChange={(e) => onUpdateItem(item.id, { cost: Math.max(0, Number(e.target.value) || 0) })}
            aria-label="Custo unitário"
            title={item.cost === 0 ? "Preencha o custo" : undefined}
          />
        </td>
        <td className="c-pct">
          <PctInput value={item.inboundTaxPct} placeholder={defaults.inboundTaxPct} label="Imposto de entrada %" onChange={(v) => onUpdateItem(item.id, { inboundTaxPct: v })} />
        </td>
        <td className="c-money calc" title="CET = custo × (1 + imposto de entrada)">{formatBRL(p.unitCet)}</td>
        <td className="c-mk">
          <MarkupInput value={item.markupPct} placeholderPct={defaults.markupPct} onCommit={(v) => onUpdateItem(item.id, { markupPct: v })} />
        </td>
        {showOutbound && (
          <td className="c-pct">
            <PctInput value={item.outboundTaxPct} placeholder={defaults.outboundTaxPct} label="Imposto de saída %" onChange={(v) => onUpdateItem(item.id, { outboundTaxPct: v })} />
          </td>
        )}
        <td className="c-money calc strong">
          {formatBRL(p.price)}
          {item.qty !== 1 && <span className="calc-sub">{formatBRL(p.unitPrice)} un.</span>}
        </td>
        <td className="c-act">
          {connected && (
            <button className="icon-btn" onClick={() => onChoose(item.category, item.id)} title="Trocar pelo estoque">⇄</button>
          )}
          <button className="icon-btn danger" onClick={() => onRemoveItem(item.id)} title="Remover">×</button>
        </td>
      </tr>
    );
  }

  function renderEmpty(slotId: ItemCategory) {
    const slot = SLOT_BY_ID.get(slotId)!;
    const active = picker.slot === slotId && !picker.replaceItemId;
    return (
      <tr key={`empty-${slotId}`} className={`row empty-row ${active ? "active" : ""}`}>
        <td className="c-prod" colSpan={showOutbound ? 8 : 7}>
          <span className="slot-tag">
            <span className="slot-icon">{slot.icon}</span>
            <span className="slot-name">{slot.label}</span>
          </span>
          <span className="empty-hint">{slot.hint}</span>
        </td>
        <td className="c-act">
          {connected && (
            <button className={`btn sm ${active ? "primary" : "ghost"}`} onClick={() => onChoose(slotId, null)}>
              Escolher
            </button>
          )}
          <button className="btn sm ghost" onClick={() => onAddManual(slotId)}>+ manual</button>
        </td>
      </tr>
    );
  }

  const suppliers = Array.from(new Set(["Estoque Upar", "Mazer", "Infocwb", "Kabum", "Mercado Livre", "Coletk", "Wzetta", "Pauta", "Microcenter", ...items.map((i) => i.supplier)].filter(Boolean)));

  return (
    <section className="pane build">
      <datalist id="suppliers">
        {suppliers.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="defaults">
        <span className="defaults-title">Padrões</span>
        <label>
          Imposto entrada
          <span className="unit-wrap">
            <input className="cell num" type="number" step={0.01} value={defaults.inboundTaxPct} onChange={(e) => onDefaultsChange({ ...defaults, inboundTaxPct: Number(e.target.value) || 0 })} aria-label="Imposto de entrada padrão" />
            <span className="unit">%</span>
          </span>
        </label>
        <label>
          Markup
          <span className="unit-wrap">
            <span className="unit">×</span>
            <MarkupInput value={defaults.markupPct} placeholderPct={defaults.markupPct} onCommit={(v) => v != null && onDefaultsChange({ ...defaults, markupPct: v })} />
          </span>
        </label>
        <label>
          Imposto saída
          <span className="unit-wrap">
            <input className="cell num" type="number" step={0.01} value={defaults.outboundTaxPct} onChange={(e) => onDefaultsChange({ ...defaults, outboundTaxPct: Number(e.target.value) || 0 })} aria-label="Imposto de saída padrão" />
            <span className="unit">%</span>
          </span>
        </label>
        <span className="defaults-formula">
          venda = custo × (1 + imposto entrada) × {formatMultiplier(defaults.markupPct)}
          {defaults.outboundTaxPct > 0 ? ` ÷ (1 − ${defaults.outboundTaxPct}%)` : ""}
        </span>
        <button className="link-btn" onClick={onResetDefaults}>restaurar</button>
      </div>

      <div className="table-wrap">
        <table className="build-table">
          <thead>
            <tr>
              <th className="c-prod">Peça · produto · fornecedor</th>
              <th className="c-qty">Qtd</th>
              <th className="c-money">Custo un.</th>
              <th className="c-pct">Imp. entr. %</th>
              <th className="c-money" title="Custo efetivo total = custo × (1 + imposto de entrada)">CET un.</th>
              <th className="c-mk">Markup ×</th>
              {showOutbound && <th className="c-pct">Imp. saída %</th>}
              <th className="c-money">Venda</th>
              <th className="c-act"></th>
            </tr>
          </thead>
          <tbody>
            {core.map((slot) => {
              const its = items.filter((i) => i.category === slot.id);
              return its.length ? its.map(renderItem) : renderEmpty(slot.id);
            })}
            {extraItems.length > 0 && (
              <tr className="row group">
                <td colSpan={showOutbound ? 9 : 8}>Extras</td>
              </tr>
            )}
            {extraItems.map(renderItem)}
          </tbody>
        </table>
      </div>

      <div className="build-foot">
        <label className="add-extra">
          Adicionar extra
          <select className="select sm" value={extraSlot} onChange={(e) => setExtraSlot(e.target.value as ItemCategory)}>
            {ITEM_CATEGORIES.filter((c) => extras.some((s) => s.id === c)).map((c) => (
              <option key={c} value={c}>{SLOT_BY_ID.get(c)!.icon} {c}</option>
            ))}
          </select>
          {connected && <button className="btn sm ghost" onClick={() => onChoose(extraSlot, null)}>do estoque</button>}
          <button className="btn sm ghost" onClick={() => onAddManual(extraSlot)}>manual</button>
        </label>
        <span className="build-hint">Campos de % e markup em cinza usam o padrão; digite para sobrescrever na peça.</span>
      </div>
    </section>
  );
}
