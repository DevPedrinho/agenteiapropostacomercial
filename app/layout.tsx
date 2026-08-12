import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agente de Proposta Comercial",
  description:
    "Gera fichas de produto no padrão Dell/Lenovo, com posicionamento, visão rápida e três estilos de saída.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
