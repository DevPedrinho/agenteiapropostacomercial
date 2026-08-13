"use client";

import { useState } from "react";
import ProposalPreview from "./ProposalPreview";
import { renderProposalHtml } from "@/lib/render-html";
import { renderProposal } from "@/lib/render-styles";
import { PROPOSAL_STYLES } from "@/lib/types";
import type { ProposalContent, ProposalStyle } from "@/lib/types";

type Props = {
  content: ProposalContent | null;
  style: ProposalStyle;
  onStyleChange: (style: ProposalStyle) => void;
};

type CopiedKind = "rich" | "source" | null;

export default function ProposalOutput({ content, style, onStyleChange }: Props) {
  const [copied, setCopied] = useState<CopiedKind>(null);

  const activeHint = PROPOSAL_STYLES.find((s) => s.id === style)?.hint;

  function flashCopied(kind: CopiedKind) {
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleCopy() {
    if (!content) return;
    const text = renderProposal(content, style);

    // Manda texto puro e HTML juntos: um editor simples (WhatsApp, campo de
    // texto) pega o texto; um editor rico que aceita colar HTML direto pega
    // o outro formato. Nem todo editor faz essa escolha sozinho — por isso
    // também existe o botão "Copiar código-fonte" abaixo.
    try {
      const html = renderProposalHtml(content, style);
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(text);
    }

    flashCopied("rich");
  }

  async function handleCopySource() {
    if (!content) return;
    await navigator.clipboard.writeText(renderProposalHtml(content, style));
    flashCopied("source");
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
            <button className="btn-secondary" type="button" onClick={handleCopySource}>
              Copiar código-fonte
            </button>
            {copied === "rich" && <span className="copy-feedback">Copiado!</span>}
            {copied === "source" && <span className="copy-feedback">Código copiado!</span>}
          </div>
          <p className="copy-hint">
            &quot;Copiar código-fonte&quot; é para colar no botão <code>&lt;&gt;</code> (código-fonte)
            do editor do Bling — cola formatado sem depender do Ctrl+V normal.
          </p>
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
