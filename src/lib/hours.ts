import { weekday } from "./format";
import type { BusinessHours, DayHours } from "./types";

/** Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC-3. */
export const SP_OFFSET = "-03:00";

export const DEFAULT_HOURS: BusinessHours = {
  "0": null,
  "1": { open: "09:00", close: "20:00", break_start: "12:00", break_end: "13:00" },
  "2": { open: "09:00", close: "20:00", break_start: "12:00", break_end: "13:00" },
  "3": { open: "09:00", close: "20:00", break_start: "12:00", break_end: "13:00" },
  "4": { open: "09:00", close: "20:00", break_start: "12:00", break_end: "13:00" },
  "5": { open: "09:00", close: "20:00", break_start: "12:00", break_end: "13:00" },
  "6": { open: "09:00", close: "16:00", break_start: null, break_end: null },
};

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Timestamp ISO com fuso de São Paulo para uma data e hora locais. */
export const toTimestamp = (date: string, hhmm: string) => `${date}T${hhmm}:00${SP_OFFSET}`;

export function dayHours(date: string, hours: BusinessHours = DEFAULT_HOURS): DayHours {
  return hours[String(weekday(date)) as keyof BusinessHours] ?? null;
}

/** Texto curto dos horários, ex.: "Seg–Sex 9h às 20h · Sáb 9h às 16h". */
export function hoursSummary(hours: BusinessHours) {
  const fmt = (h: string) => (h.endsWith(":00") ? `${Number(h.slice(0, 2))}h` : h.replace(":", "h"));
  const groups: { from: number; to: number; label: string }[] = [];
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const h = hours[String(d) as keyof BusinessHours];
    const label = h ? `${fmt(h.open)} às ${fmt(h.close)}` : "";
    const last = groups[groups.length - 1];
    if (last && last.label === label && label) last.to = d;
    else groups.push({ from: d, to: d, label });
  }
  const short = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return groups
    .filter((g) => g.label)
    .map((g) => `${short[g.from]}${g.from !== g.to ? `–${short[g.to]}` : ""} ${g.label}`)
    .join(" · ");
}

/** Horários de início possíveis para um serviço de `duration` minutos no dia. */
export function candidateSlots(date: string, duration: number, hours: BusinessHours = DEFAULT_HOURS, step = 30) {
  const h = dayHours(date, hours);
  if (!h) return [];
  const open = toMinutes(h.open);
  const close = toMinutes(h.close);
  const bs = h.break_start ? toMinutes(h.break_start) : null;
  const be = h.break_end ? toMinutes(h.break_end) : null;
  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += step) {
    const overlapsBreak = bs !== null && be !== null && t < be && t + duration > bs;
    if (!overlapsBreak) slots.push(toHHMM(t));
  }
  return slots;
}

/** Filtra os horários que não colidem com intervalos ocupados e não estão no passado. */
export function freeSlots(
  date: string,
  duration: number,
  busy: { starts_at: string; ends_at: string }[],
  notBefore: Date,
  hours: BusinessHours = DEFAULT_HOURS,
  step = 30,
) {
  const ranges = busy.map((b) => [Date.parse(b.starts_at), Date.parse(b.ends_at)] as const);
  return candidateSlots(date, duration, hours, step).map((time) => {
    const start = Date.parse(toTimestamp(date, time));
    const end = start + duration * 60_000;
    const taken = ranges.some(([s, e]) => start < e && end > s);
    return { time, available: !taken && start >= notBefore.getTime() };
  });
}
