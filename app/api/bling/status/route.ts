import { getBlingConfig, readSession } from "@/lib/bling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = getBlingConfig();
  if (!cfg) return Response.json({ configured: false, connected: false });
  const session = await readSession(cfg);
  return Response.json({
    configured: true,
    connected: Boolean(session),
    expiresAt: session ? new Date(session.expiresAt).toISOString() : null,
  });
}
