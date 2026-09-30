import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Ficha ligada à conta do site que está entrando (null para visitante ou equipe). */
export async function currentClient(): Promise<{ id: string; name: string; phone: string; welcome_discount_pct: number } | null> {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  const db = createAdminClient();
  if (!user || !db) return null;
  const { data } = await db.from("clients").select("id, name, phone, welcome_discount_pct").eq("user_id", user.id).maybeSingle();
  return data ? { ...data, welcome_discount_pct: Number(data.welcome_discount_pct) } : null;
}
