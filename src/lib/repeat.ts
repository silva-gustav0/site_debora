import { addDays, weekday } from "./format";
import { dayHours, toTimestamp } from "./hours";
import type { BusinessHours } from "./types";

export const REPEAT_PRESETS = [5, 10, 15];
export const REPEAT_MAX = 60;
/** Até onde procurar datas livres para as sessões seguintes. */
const HORIZON_DAYS = 366;

type Busy = { starts_at: string; ends_at: string };

/**
 * Datas das sessões de um agendamento recorrente (pacote/plano): a primeira na data escolhida e as seguintes nos
 * dias da semana marcados, no mesmo horário. Pula dias fechados e horários já ocupados (`busy`: outras clientes e
 * bloqueios), seguindo até completar `count` sessões. `skipped` são as datas puladas por estarem ocupadas.
 */
export function planSessions({ date, time, duration, weekdays, count, hours, busy }: {
  date: string; time: string; duration: number; weekdays: number[]; count: number; hours: BusinessHours; busy: Busy[];
}) {
  const dates = [date];
  const skipped: string[] = [];
  const days = new Set(weekdays.length ? weekdays : [weekday(date)]);
  const taken = busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);
  for (let i = 1; i <= HORIZON_DAYS && dates.length < count; i++) {
    const d = addDays(date, i);
    if (!days.has(weekday(d)) || !dayHours(d, hours)) continue;
    const start = Date.parse(toTimestamp(d, time));
    const end = start + duration * 60_000;
    if (taken.some(([s, e]) => s < end && e > start)) skipped.push(d);
    else dates.push(d);
  }
  return { dates, skipped };
}
