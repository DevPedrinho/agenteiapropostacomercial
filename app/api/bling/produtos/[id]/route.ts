import { errorResponse, getProduct } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bling/produtos/{id} — detalhe, incluindo preço de custo. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return Response.json({ error: "ID de produto inválido." }, { status: 400 });
  }
  try {
    const product = await getProduct(numeric);
    return Response.json({ product });
  } catch (err) {
    return errorResponse(err);
  }
}
