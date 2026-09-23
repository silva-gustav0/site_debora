import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifica a sessão e se o usuário faz parte da equipe.
 * Deduplicado por requisição com React.cache.
 */
export const getStaff = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { supabase, userId: null, staff: null } as const;

  const { data: staff } = await supabase
    .from("staff")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle();

  return { supabase, userId, staff: staff as { name: string } | null } as const;
});

/** Use em toda página e action do painel. */
export async function requireStaff() {
  const s = await getStaff();
  if (!s.userId) redirect("/painel/login");
  if (!s.staff) redirect("/painel/sem-acesso");
  return { supabase: s.supabase, userId: s.userId, staff: s.staff };
}
