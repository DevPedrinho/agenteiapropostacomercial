import { getSpecIcon, SECTION_ICONS } from "@/lib/icons";
import { groupFullSpecs } from "@/lib/spec-groups";
import type { ProposalContent, ProposalStyle } from "@/lib/types";

type Props = {
  content: ProposalContent;
  style: ProposalStyle;
};

/**
 * Pré-visualização visual do conteúdo estruturado — não é o texto que vai
 * ser copiado (isso continua sendo o textarea abaixo, gerado por
 * render-styles.ts). Serve só pra dar uma ideia legível da ficha antes de
 * copiar, com tipografia e espaçamento reais em vez de réguas de texto.
 */
export default function ProposalPreview({ content, style }: Props) {
  const showEmoji = style === "comercial" || style === "compacto";
  const isB2B = style === "b2b";
  const isCompacto = style === "compacto";
  const groups = groupFullSpecs(content.fullSpecs);

  return (
    <div className="preview-card">
      <div className="preview-header">
        <h3>
          {showEmoji && <span className="preview-icon">{SECTION_ICONS.title} </span>}
          {content.productName}
        </h3>
        <div className="chip-row">
          {content.skuLine.split("|").map((part, i) => (
            <span className="chip" key={i}>
              {part.trim()}
            </span>
          ))}
        </div>
        {!isB2B && <p className="preview-positioning">{content.positioning}</p>}
      </div>

      <section className="preview-section">
        <h4 className="preview-section-title">
          {isB2B ? "Destaques da configuração" : "Visão rápida"}
        </h4>
        <div className="quick-grid">
          {content.quickView.map((s, i) => (
            <div className="quick-item" key={i}>
              {showEmoji && <span className="quick-icon">{getSpecIcon(s.label)}</span>}
              <div>
                <div className="quick-label">{s.label}</div>
                <div className="quick-value">{s.value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!isCompacto && (
        <section className="preview-section">
          <h4 className="preview-section-title">Especificações técnicas</h4>
          {groups.map(({ group, items }) => (
            <div className="spec-group" key={group}>
              <div className="spec-group-title">{group}</div>
              {items.map((item, i) => (
                <div className="spec-item" key={i}>
                  <div className="spec-item-label">{item.label}</div>
                  <ul className="spec-item-facts">
                    {item.facts.map((fact, j) => (
                      <li key={j}>{fact}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      <div className="preview-columns">
        <section className="preview-section">
          <h4 className="preview-section-title">
            {isB2B ? "Aplicações recomendadas" : "Indicado para"}
          </h4>
          <div className="tag-list">
            {content.indicatedFor.map((line, i) => (
              <span className="tag" key={i}>
                {line}
              </span>
            ))}
          </div>
        </section>

        {!isB2B && (
          <section className="preview-section">
            <h4 className="preview-section-title">Por que essa configuração</h4>
            <ul className="check-list">
              {content.whyThisConfig.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
