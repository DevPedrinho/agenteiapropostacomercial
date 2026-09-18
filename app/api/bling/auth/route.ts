import { buildAuthorizeUrl, errorResponse, requireBlingConfig } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Inicia o OAuth: manda o vendedor para a tela de autorização do Bling. */
export async function GET() {
  try {
    const cfg = requireBlingConfig();
    const url = await buildAuthorizeUrl(cfg);
    return Response.redirect(url, 302);
  } catch (err) {
    return errorResponse(err);
  }
}
