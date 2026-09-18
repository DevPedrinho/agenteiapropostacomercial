import type { Metadata } from "next";
import QuoteWorkspace from "@/components/QuoteWorkspaceLoader";

export const metadata: Metadata = {
  title: "Montador de Orçamento — Upar",
  description:
    "Monta orçamentos personalizados item a item com imposto de entrada, markup, CET e imposto de saída, puxando estoque do Bling.",
};

type SearchParams = Promise<{ bling?: string; detalhe?: string }>;

export default async function OrcamentoPage({ searchParams }: { searchParams: SearchParams }) {
  const { bling, detalhe } = await searchParams;
  const blingResult = bling ? { status: bling, detail: detalhe ?? null } : null;
  return (
    <main className="wide">
      <div className="page-header">
        <h1>Montador de Orçamento</h1>
        <p>
          Peça por peça, com custo, imposto de entrada, markup, CET e imposto de saída — o mesmo
          cálculo da planilha, sem planilha. Busque o que tem em estoque direto do Bling.
        </p>
      </div>
      <QuoteWorkspace blingResult={blingResult} />
    </main>
  );
}
