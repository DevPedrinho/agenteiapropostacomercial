import { NextResponse } from "next/server";
import { generateProposalContent } from "@/lib/generate-proposal";
import type { ProductSpecInput } from "@/lib/types";

export const runtime = "nodejs";

function isValidInput(body: unknown): body is ProductSpecInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.productName !== "string" || !b.productName.trim()) return false;
  if (!Array.isArray(b.specs)) return false;
  const validSpecs = b.specs.some(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof (s as Record<string, unknown>).label === "string" &&
      typeof (s as Record<string, unknown>).value === "string" &&
      (s as Record<string, string>).label.trim() &&
      (s as Record<string, string>).value.trim()
  );
  return validSpecs;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido no corpo da requisição." }, { status: 400 });
  }

  if (!isValidInput(body)) {
    return NextResponse.json(
      { error: "Informe o nome do produto e ao menos um spec preenchido (label e valor)." },
      { status: 400 }
    );
  }

  try {
    const content = await generateProposalContent(body);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar a proposta.";
    const status = message.includes("ANTHROPIC_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
