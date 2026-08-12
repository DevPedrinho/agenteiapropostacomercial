"use client";

import { useState } from "react";
import SpecEditor from "./SpecEditor";
import ProposalOutput from "./ProposalOutput";
import type { ProductSpecInput, ProposalContent, ProposalStyle } from "@/lib/types";

const DEFAULT_INPUT: ProductSpecInput = {
  productName: "",
  rawSpecs: "",
  audience: "",
  notes: "",
};

export default function ProposalWorkspace() {
  const [input, setInput] = useState<ProductSpecInput>(DEFAULT_INPUT);
  const [content, setContent] = useState<ProposalContent | null>(null);
  const [style, setStyle] = useState<ProposalStyle>("comercial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar a proposta.");
      }
      setContent(data.content as ProposalContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar a proposta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout-grid">
      <SpecEditor value={input} onChange={setInput} onSubmit={handleSubmit} loading={loading} />
      <div>
        {error && <div className="error-box">{error}</div>}
        <ProposalOutput content={content} style={style} onStyleChange={setStyle} />
      </div>
    </div>
  );
}
