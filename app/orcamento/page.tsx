import type { Metadata } from "next";
import QuoteWorkspace from "@/components/QuoteWorkspaceLoader";

export const metadata: Metadata = {
  title: "Montador de Setup — Upar",
  description:
    "Monta a máquina peça por peça a partir do estoque do Bling, com custo, imposto de entrada, CET, markup e imposto de saída, e compara opções contra a meta do cliente.",
};

type SearchParams = Promise<{ bling?: string; detalhe?: string }>;

export default async function OrcamentoPage({ searchParams }: { searchParams: SearchParams }) {
  const { bling, detalhe } = await searchParams;
  const blingResult = bling ? { status: bling, detail: detalhe ?? null } : null;
  return (
    <main className="app">
      <QuoteWorkspace blingResult={blingResult} />
    </main>
  );
}
