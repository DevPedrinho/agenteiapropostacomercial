import ProposalWorkspace from "@/components/ProposalWorkspace";

export default function Home() {
  return (
    <main>
      <div className="page-header">
        <h1>Agente de Proposta Comercial</h1>
        <p>
          Ficha de produto no padrão Dell/Lenovo: posicionamento, visão rápida e ficha
          completa, com três estilos de saída trocáveis sem gastar nova geração.
        </p>
      </div>
      <ProposalWorkspace />
    </main>
  );
}
