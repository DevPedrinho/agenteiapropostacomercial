"use client";

import { formatBRL, formatMultiplier, formatPct, markupToHitTarget, totalItems, type QuoteTotals } from "@/lib/pricing";
import type { Quote, Variant } from "@/lib/quote-types";

type Props = {
  quote: Quote;
  variant: Variant;
  totals: QuoteTotals;
  hasItems: boolean;
  onApplyMarkup: (markupPct: number) => void;
  onSelectVariant: (id: string) => void;
  onNotesChange: (notes: string) => void;
  onCopyCustomer: () => void;
  onCopyInternal: () => void;
  onDownloadCsv: () => void;
  onSendToProposal: () => void;
};

export default function SummaryPane({
  quote,
  variant,
  totals,
  hasItems,
  onApplyMarkup,
  onSelectVariant,
  onNotesChange,
  onCopyCustomer,
  onCopyInternal,
  onDownloadCsv,
  onSendToProposal,
}: Props) {
  const target = quote.targetBudget;
  const hasTarget = target != null && target > 0;
  const suggested = hasTarget && hasItems ? markupToHitTarget(variant.items, quote.defaults, target) : null;
  const over = totals.diffToTarget != null && totals.diffToTarget > 0;
  const ratio = hasTarget ? Math.min(totals.price / target, 1) : 0;

  return (
    <aside className="pane summary">
      <div className="total">
        <span className="total-label">Venda · {variant.name}</span>
        <span className="total-value">{formatBRL(totals.price)}</span>
        {hasTarget && (
          <span className={`total-diff ${over ? "bad" : "ok"}`}>
            {totals.diffToTarget! > 0
              ? `${formatBRL(totals.diffToTarget!)} acima da meta`
              : totals.diffToTarget! < 0
                ? `${formatBRL(-totals.diffToTarget!)} de folga na meta`
                : "na meta"}
          </span>
        )}
      </div>

      {hasTarget && (
        <div className="meta-bar" title={`Meta ${formatBRL(target)}`}>
          <div className={`meta-fill ${over ? "bad" : ""}`} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}

      <dl className="kv">
        <div><dt>Custo (fornecedor)</dt><dd>{formatBRL(totals.cost)}</dd></div>
        <div><dt>Imposto de entrada</dt><dd>{formatBRL(totals.inboundTax)}</dd></div>
        <div className="kv-strong"><dt>CET</dt><dd>{formatBRL(totals.cet)}</dd></div>
        {totals.outboundTax > 0 && <div><dt>Imposto de saída</dt><dd>{formatBRL(totals.outboundTax)}</dd></div>}
        <div className="kv-profit">
          <dt>Lucro líquido</dt>
          <dd>{formatBRL(totals.profit)}</dd>
        </div>
        <div className="kv-sub">
          <dt>Margem · markup efetivo</dt>
          <dd>{formatPct(totals.marginPct * 100)} · {formatMultiplier(totals.effectiveMarkupPct * 100)}</dd>
        </div>
      </dl>

      {hasTarget && suggested != null && (
        <div className="suggest">
          {suggested >= 0 ? (
            <>
              <span>
                Markup <strong>{formatMultiplier(suggested)}</strong> fecha em {formatBRL(target)}
              </span>
              <button className="btn sm ghost" onClick={() => onApplyMarkup(Math.round(suggested * 10000) / 10000)}>Aplicar</button>
            </>
          ) : (
            <span className="bad">Nem com markup ×1,00 cabe na meta: o CET já passa de {formatBRL(target)}.</span>
          )}
        </div>
      )}

      {quote.variants.length > 1 && (
        <div className="compare">
          <span className="pane-title">Comparar opções</span>
          {quote.variants.map((v) => {
            const t = totalItems(v.items, quote.defaults, quote.targetBudget);
            const active = v.id === variant.id;
            return (
              <button key={v.id} className={`compare-row ${active ? "active" : ""}`} onClick={() => onSelectVariant(v.id)}>
                <span className="compare-name">{v.name}</span>
                <span className="compare-price">{formatBRL(t.price)}</span>
                <span className="compare-sub">
                  lucro {formatBRL(t.profit)} · {formatPct(t.marginPct * 100)}
                  {t.diffToTarget != null && (
                    <span className={t.diffToTarget > 0 ? "bad" : "ok"}>
                      {" · "}
                      {t.diffToTarget > 0 ? `+${formatBRL(t.diffToTarget)}` : `−${formatBRL(-t.diffToTarget)}`}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="notes">
        <label htmlFor="quoteNotes">Observações para o cliente</label>
        <textarea
          id="quoteNotes"
          rows={3}
          value={quote.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Garantia, prazo de entrega, forma de pagamento…"
        />
      </div>

      <div className="actions">
        <button className="btn primary" onClick={onCopyCustomer} disabled={!hasItems}>Copiar p/ cliente</button>
        <button className="btn ghost" onClick={onCopyInternal} disabled={!hasItems}>Copiar resumo interno</button>
        <button className="btn ghost" onClick={onDownloadCsv} disabled={!hasItems}>Baixar CSV</button>
        <button className="btn ghost" onClick={onSendToProposal} disabled={!hasItems}>Gerar ficha de produto →</button>
        <span className="actions-hint">O texto p/ cliente sai só com peças e preço de venda. O CSV traz todas as opções com custo, CET e margem.</span>
      </div>
    </aside>
  );
}
