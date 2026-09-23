import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./format";
import { SP_OFFSET } from "./hours";
import { computeRecurrence, type Recurrence } from "./recurrence";
import type { AppointmentWithRefs, ClientPackage, ClientRow, ClientStats, ServiceRow, TimeBlock } from "./types";

export const APPT_SELECT = "*, clients(id, name, phone), services(id, name, duration_min)";

/** Início do dia `date` em São Paulo, como timestamp. */
export const dayStart = (date: string) => `${date}T00:00:00${SP_OFFSET}`;

/** Atendimentos com início entre as datas [from, to] (inclusivas, horário de SP). */
export async function appointmentsBetween(db: SupabaseClient, from: string, to: string) {
  const { data } = await db
    .from("appointments")
    .select(APPT_SELECT)
    .gte("starts_at", dayStart(from))
    .lt("starts_at", dayStart(addDays(to, 1)))
    .order("starts_at");
  return (data ?? []) as AppointmentWithRefs[];
}

export async function blocksBetween(db: SupabaseClient, from: string, to: string) {
  const { data } = await db
    .from("time_blocks")
    .select("id, starts_at, ends_at, reason")
    .lt("starts_at", dayStart(addDays(to, 1)))
    .gt("ends_at", dayStart(from))
    .order("starts_at");
  return (data ?? []) as TimeBlock[];
}

export async function listServices(db: SupabaseClient) {
  const { data } = await db.from("services").select("*").order("sort_order").order("name");
  return (data ?? []) as ServiceRow[];
}

export async function activePackages(db: SupabaseClient, clientId?: string) {
  let q = db.from("client_package_usage").select("*").eq("status", "ativo").order("purchased_on");
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return (data ?? []) as ClientPackage[];
}

export type ClientWithStats = ClientRow & { stats: ClientStats | undefined; recurrence: Recurrence };

/** Todas as clientes com estatísticas e situação de recorrência calculada. */
export async function clientsWithStats(db: SupabaseClient, today: string): Promise<ClientWithStats[]> {
  const [{ data: clients }, { data: stats }, services] = await Promise.all([
    db.from("clients").select("*").order("name"),
    db.from("client_stats").select("*"),
    listServices(db),
  ]);
  const statsById = new Map(((stats as ClientStats[] | null) ?? []).map((s) => [s.client_id, s]));
  const returnDays = new Map(services.map((s) => [s.id, s.return_days]));

  return ((clients ?? []) as ClientRow[]).map((c) => {
    const s = statsById.get(c.id);
    return {
      ...c,
      stats: s,
      recurrence: computeRecurrence(s, s?.last_service_id ? returnDays.get(s.last_service_id) : null, today),
    };
  });
}
