import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, withinLimits } from "@/lib/rate-limit";

const KINDS = new Set(["visita", "servico", "promocao", "secao", "whatsapp"]);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

/** Recebe em lote o que a visitante viu no site (enviado pelo navegador ao sair ou a cada poucos segundos). */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { s?: unknown; e?: unknown } | null;
  const session = text(body?.s, 40);
  if (!session || session.length < 8 || !Array.isArray(body?.e)) return new Response(null, { status: 400 });
  const rows = body.e.slice(0, 40)
    .map((e: { k?: unknown; t?: unknown; p?: unknown }) => ({ session, kind: text(e?.k, 20) ?? "", target: text(e?.t, 120), path: text(e?.p, 200) }))
    .filter((r) => KINDS.has(r.kind));
  if (!rows.length) return new Response(null, { status: 204 });

  const db = createAdminClient();
  if (!db || !(await withinLimits(db, [{ bucket: "eventos-ip-h", key: await clientIp(), max: 120, windowSec: 3600 }]))) {
    return new Response(null, { status: 204 });
  }
  await db.from("site_events").insert(rows);
  // Guarda só os últimos 12 meses.
  if (Math.random() < 0.01) await db.from("site_events").delete().lt("created_at", new Date(Date.now() - 365 * 86_400_000).toISOString());
  return new Response(null, { status: 204 });
}
