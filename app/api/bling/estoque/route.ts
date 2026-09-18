import type { NextRequest } from "next/server";
import { errorResponse, getStockBalances } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bling/estoque?ids=1,2,3 — saldo físico e virtual por produto. */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) return Response.json({ balances: [] });
  try {
    const balances = await getStockBalances(ids);
    return Response.json({ balances, checkedAt: new Date().toISOString() });
  } catch (err) {
    return errorResponse(err);
  }
}
