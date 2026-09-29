import { useQuery } from "@powersync/react-native";
import { DEFAULT_SETTINGS } from "@shared/settings-core";
import type { Settings } from "@shared/types";
import { useMemo } from "react";
import { useSession } from "@/lib/session";

/** SQLite devolve booleano como 0/1 e json/listas como texto. */
export const asBool = (v: unknown) => v === 1 || v === true || v === "1" || v === "true";
export function asJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined || v === "") return fallback;
  if (typeof v !== "string") return v as T;
  try { return JSON.parse(v) as T; } catch { return fallback; }
}
export const asList = (v: unknown) => asJson<string[]>(v, []);

/** Endereço público do site (links "meu agendamento", anamnese, voucher enviados às clientes). */
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://clinica-talissa-eta.vercel.app").replace(/\/$/, "");

type SettingsRow = Record<string, unknown>;

/** Configurações da clínica (com os padrões para o que ainda não foi salvo), iguais às do painel web. */
export function useSettings(): Settings {
  const { data } = useQuery<SettingsRow>("select * from settings limit 1");
  const row = data[0];
  return useMemo(() => {
    if (!row) return DEFAULT_SETTINGS;
    const templates = asJson<Partial<Settings["templates"]>>(row.templates, {});
    return {
      ...DEFAULT_SETTINGS,
      clinic_name: (row.clinic_name as string) || DEFAULT_SETTINGS.clinic_name,
      whatsapp: (row.whatsapp as string) ?? DEFAULT_SETTINGS.whatsapp,
      address: (row.address as string) ?? DEFAULT_SETTINGS.address,
      business_hours: asJson(row.business_hours, DEFAULT_SETTINGS.business_hours),
      slot_step_min: Number(row.slot_step_min ?? DEFAULT_SETTINGS.slot_step_min),
      min_lead_min: Number(row.min_lead_min ?? DEFAULT_SETTINGS.min_lead_min),
      max_days_ahead: Number(row.max_days_ahead ?? DEFAULT_SETTINGS.max_days_ahead),
      cancel_min_hours: Number(row.cancel_min_hours ?? DEFAULT_SETTINGS.cancel_min_hours),
      fee_credit: Number(row.fee_credit ?? DEFAULT_SETTINGS.fee_credit),
      fee_debit: Number(row.fee_debit ?? DEFAULT_SETTINGS.fee_debit),
      templates: { ...DEFAULT_SETTINGS.templates, ...templates },
      anamnesis_form: asJson(row.anamnesis_form, null),
      consent_text: (row.consent_text as string) ?? null,
    };
  }, [row]);
}

export type Me = { id: string; name: string; isAdmin: boolean };

/** Pessoa logada e se é administradora (dar/tirar acessos). */
export function useMe(): Me | null {
  const { session } = useSession();
  const uid = session?.user.id ?? "";
  const { data } = useQuery<{ name: string; is_admin: number }>("select name, is_admin from staff where id = ?", [uid]);
  const r = data[0];
  return useMemo(() => (r ? { id: uid, name: r.name, isAdmin: asBool(r.is_admin) } : null), [r, uid]);
}

export type ServiceOption = { id: string; name: string; duration_min: number; price: number; active: boolean; return_days: number | null };

/** Serviços (ativos primeiro), para escolher no agendamento, pacotes e vouchers. */
export function useServices(onlyActive = false) {
  const { data } = useQuery<{ id: string; name: string; duration_min: number; price: number; active: number; return_days: number | null }>(
    `select id, name, duration_min, price, active, return_days from services ${onlyActive ? "where active = 1" : ""} order by active desc, sort_order, name`,
  );
  return useMemo<ServiceOption[]>(() => data.map((s) => ({ ...s, price: Number(s.price), active: asBool(s.active) })), [data]);
}
