"use client";

import dynamic from "next/dynamic";

/** Só no cliente: o estado inicial lê a lista de peças enviada pelo montador de orçamento. */
const ProposalWorkspace = dynamic(() => import("./ProposalWorkspace"), {
  ssr: false,
  loading: () => <div className="empty-state">Carregando…</div>,
});

export default ProposalWorkspace;
