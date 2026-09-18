import type { NextRequest } from "next/server";
import { consumeOAuthState, exchangeCode, requireBlingConfig, writeSession } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * URL de redirecionamento cadastrada no aplicativo do Bling:
 *   https://SEU-DOMINIO/api/bling/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (status: string, detail?: string) => {
    const url = new URL("/orcamento", origin);
    url.searchParams.set("bling", status);
    if (detail) url.searchParams.set("detalhe", detail.slice(0, 200));
    return Response.redirect(url.toString(), 302);
  };

  const denied = searchParams.get("error");
  if (denied) return back("erro", searchParams.get("error_description") || denied);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code) return back("erro", "O Bling não devolveu o código de autorização.");
  if (!(await consumeOAuthState(state))) {
    return back("erro", "Estado do OAuth inválido. Tente conectar de novo.");
  }

  try {
    const cfg = requireBlingConfig();
    const session = await exchangeCode(cfg, code);
    await writeSession(cfg, session);
    return back("ok");
  } catch (err) {
    return back("erro", err instanceof Error ? err.message : "Falha ao trocar o código pelo token.");
  }
}
