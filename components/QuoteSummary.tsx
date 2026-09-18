"use client";

import { formatBRL, formatPct, markupToHitTarget, type QuoteTotals } from "@/lib/pricing";
import type { Quote } from "@/lib/quote-types";

type Props = {
  quote: Quote;
  totals: QuoteTotals;
  onApplyMarkup: (markupPct: number) => void;
};

export default function QuoteSummary({ quote, totals, onApplyMarkup }: Props) {
  const target = quote.targetBudget;
  const suggested = target != null && quote.items.length > 0 ? markupToHitTarget(quote, target) : null;
  const ratio = target && target > 0 ? Math.min(totals.price / target, 1.5) : 0;
  const over = totals.diffToTarget != null && totals.diffToTarget > 0;

  return (
    <section className="panel summary-panel">
      <h2>Resumo</h2>
      <div className="summary-grid">
        <Stat label="Custo (fornecedor)" value={formatBRL(totals.cost)} />
        <Stat label="Imposto de entrada" value={formatBRL(totals.inboundTax)} />
        <Stat label="Custo c/ entrada" value={formatBRL(totals.landedCost)} />
        <Stat label="Imposto de saída" value={formatBRL(totals.outboundTax)} />
        <Stat label="CET (pagamento)" value={formatBRL(totals.cet)} />
        <Stat
          label="Lucro líquido"
          value={formatBRL(totals.profit)}
          sub={`${formatPct(totals.marginPct * 100)} da venda · markup efetivo ${formatPct(totals.effectiveMarkupPct * 100)}`}
          accent
        />
        <Stat label="Total de venda" value={formatBRL(totals.price)} big />
      </div>

      {target != null && target > 0 && (
        <div className="target-box">
          <div className="target-row">
            <span>Meta do cliente: <strong>{formatBRL(target)}</strong></span>
            <span className={over ? "target-over" : "target-under"}>
              {totals.diffToTarget! > 0
                ? `${formatBRL(totals.diffToTarget!)} acima`
                : totals.diffToTarget! < 0
                  ? `${formatBRL(-totals.diffToTarget!)} de folga`
                  : "na meta"}
            </span>
          </div>
          <div className="target-bar">
            <div className={`target-fill ${over ? "over" : ""}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
          </div>
          {suggested != null && (
            <div className="target-suggest">
              {suggested >= 0 ? (
                <>
                  <span>
                    Markup padrão de <strong>{formatPct(suggested, 2)}</strong> fecha exatamente na meta
                    (itens com markup próprio ficam como estão).
                  </span>
                  <button className="btn-secondary" onClick={() => onApplyMarkup(Math.round(suggested * 10000) / 10000)}>
                    Aplicar
                  </button>
                </>
              ) : (
                <span className="target-over">
                  Nem com markup zero cabe na meta: o custo com impostos já passa de {formatBRL(target)}.
                  Troque peças ou renegocie o valor.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  big,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  big?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`stat ${big ? "stat-big" : ""} ${accent ? "stat-accent" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
