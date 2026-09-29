import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "./settings-core";
import type { Settings } from "./types";

export async function getSettings(db: SupabaseClient): Promise<Settings> {
  const { data } = await db.from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    fee_credit: Number(data.fee_credit),
    fee_debit: Number(data.fee_debit),
    templates: { ...DEFAULT_SETTINGS.templates, ...(data.templates ?? {}) },
  } as Settings;
}

export { cardFee, DEFAULT_SETTINGS } from "./settings-core";
