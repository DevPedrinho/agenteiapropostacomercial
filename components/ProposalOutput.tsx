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

export default function ProposalOutput({ content, style, onStyleChange }: Props) {
  const [copied, setCopied] = useState(false);

  const activeHint = PROPOSAL_STYLES.find((s) => s.id === style)?.hint;

  async function handleCopy() {
    if (!content) return;
    await navigator.clipboard.writeText(renderProposal(content, style));
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
