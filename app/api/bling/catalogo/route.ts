import type { NextRequest } from "next/server";
import { errorResponse, getCatalog } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Catálogo grande pode levar vários segundos (uma página a cada 400ms). */
export const maxDuration = 60;

/** GET /api/bling/catalogo?refresh=1 — todos os produtos ativos, classificados por slot. */
export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  try {
    const catalog = await getCatalog(refresh);
    return Response.json({
      products: catalog.products,
      fetchedAt: catalog.fetchedAt,
      truncated: catalog.truncated,
      total: catalog.products.length,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
