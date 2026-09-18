import type { NextRequest } from "next/server";
import { errorResponse, getStockBalances, searchProducts } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bling/produtos?q=texto&pagina=1 — busca por nome, com saldo em estoque. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const page = Number(request.nextUrl.searchParams.get("pagina") ?? "1") || 1;
  try {
    const products = await searchProducts(q, page);
    // A listagem costuma trazer `estoque.saldoVirtual`; quando não traz, completa
    // com o endpoint de saldos. Falha aqui não derruba a busca.
    const missing = products.filter((p) => p.stock == null).map((p) => p.id);
    if (missing.length > 0) {
      const balances = await getStockBalances(missing).catch(() => []);
      const byId = new Map(balances.map((b) => [b.productId, b]));
      for (const p of products) {
        const b = byId.get(p.id);
        if (b) {
          p.stock = b.virtual ?? p.stock;
          p.stockPhysical = b.physical ?? p.stockPhysical;
        }
      }
    }
    return Response.json({ products, page });
  } catch (err) {
    return errorResponse(err);
  }
}
