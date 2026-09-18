import type { Metadata } from "next";
import QuoteWorkspace from "@/components/QuoteWorkspaceLoader";

export const metadata: Metadata = {
  title: "Montador de Setup — Upar",
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
        <h1>Montador de Setup</h1>
        <p>
          Monte a máquina peça por peça escolhendo do que tem em estoque no Bling. O preço de cada
          peça sai com custo, imposto de entrada, markup, CET e imposto de saída — o mesmo cálculo
          da planilha, sem planilha.
        </p>
      </div>
      <QuoteWorkspace blingResult={blingResult} />
    </main>
  );
}
