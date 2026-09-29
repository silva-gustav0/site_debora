import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Anamnesis } from "@/lib/types";

export type AnamnesisLinkView =
  | { state: "ok"; token: string; clientId: string; firstName: string; anamnesis: Anamnesis; expiresAt: string; submittedAt: string | null; service: string; startsAt: string }
  | { state: "expired" | "revoked" | "invalid" };

/** Valida o token do link de anamnese e devolve o cliente ligado a ele (só se ainda estiver valendo). */
export async function getAnamnesisLink(token: string): Promise<AnamnesisLinkView> {
  const db = createAdminClient();
  if (!db || !/^[0-9a-f-]{36}$/i.test(token)) return { state: "invalid" };
  const { data } = await db.from("anamnesis_links")
    .select("token, client_id, expires_at, submitted_at, revoked_at, clients(name, anamnesis), appointments(starts_at, status, services(name))")
    .eq("token", token).maybeSingle();
  if (!data) return { state: "invalid" };
  if (data.revoked_at) return { state: "revoked" };
  if (Date.parse(data.expires_at) <= Date.now()) return { state: "expired" };
  const cli = data.clients as unknown as { name: string; anamnesis: Anamnesis | null } | null;
  const appt = data.appointments as unknown as { starts_at: string; status: string; services: { name: string } | null } | null;
  if (appt && ["cancelado", "faltou"].includes(appt.status)) return { state: "revoked" };
  return {
    state: "ok", token: data.token, clientId: data.client_id, firstName: (cli?.name ?? "").split(" ")[0],
    anamnesis: cli?.anamnesis ?? {}, expiresAt: data.expires_at, submittedAt: data.submitted_at,
    service: appt?.services?.name ?? "Atendimento", startsAt: appt?.starts_at ?? "",
  };
}
