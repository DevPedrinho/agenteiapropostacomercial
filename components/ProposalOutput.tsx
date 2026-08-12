"use client";

import { useState } from "react";
import ProposalPreview from "./ProposalPreview";
import { renderProposal } from "@/lib/render-styles";
import { PROPOSAL_STYLES } from "@/lib/types";
import type { ProposalContent, ProposalStyle } from "@/lib/types";

type Props = {
  content: ProposalContent | null;
  style: ProposalStyle;
  onStyleChange: (style: ProposalStyle) => void;
};

function renderOrEmpty(content: ProposalContent | null, style: ProposalStyle): string {
  return content ? renderProposal(content, style) : "";
}

export default function ProposalOutput({ content, style, onStyleChange }: Props) {
  const [text, setText] = useState(() => renderOrEmpty(content, style));
  const [copied, setCopied] = useState(false);
  const [renderedFor, setRenderedFor] = useState<{ content: ProposalContent | null; style: ProposalStyle }>({
    content,
    style,
  });

  // Trocar estilo remonta o texto a partir do conteúdo estruturado já
  // gerado — nenhuma nova chamada de geração acontece aqui. Isso ajusta o
  // estado durante a renderização (padrão recomendado pelo React para
  // "resetar" estado quando uma prop muda), em vez de um useEffect.
  if (renderedFor.content !== content || renderedFor.style !== style) {
    setRenderedFor({ content, style });
    setText(renderOrEmpty(content, style));
    setCopied(false);
  }

  const activeHint = PROPOSAL_STYLES.find((s) => s.id === style)?.hint;

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="panel">
      <h2>Saída</h2>

      <div className="style-switcher">
        {PROPOSAL_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={s.id === style ? "active" : ""}
            onClick={() => onStyleChange(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {activeHint && <p className="style-hint">{activeHint}</p>}

      {content ? (
        <>
          <ProposalPreview content={content} style={style} />

          <p className="copy-text-label">Texto para copiar</p>
          <textarea
            className="output-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
          />
          <div className="output-actions">
            <button className="btn" type="button" onClick={handleCopy}>
              Copiar
            </button>
            {copied && <span className="copy-feedback">Copiado!</span>}
          </div>
        </>
      ) : (
        <div className="empty-state">
          Preencha os dados do produto e clique em &quot;Gerar proposta&quot; para ver a
          ficha aqui.
        </div>
      )}
    </section>
  );
}
