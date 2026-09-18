"use client";

import dynamic from "next/dynamic";

/**
 * O montador lê localStorage no estado inicial, então só renderiza no cliente
 * (evita divergência de hidratação entre servidor e navegador).
 */
const QuoteWorkspace = dynamic(() => import("./QuoteWorkspace"), {
  ssr: false,
  loading: () => <div className="empty-state">Carregando orçamentos…</div>,
});

export default QuoteWorkspace;
