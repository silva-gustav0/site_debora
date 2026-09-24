import { addDays, dateSP, diffDays } from "./format";
import type { ClientStats } from "./types";
import type { Tone } from "@/components/painel/ui";

export type RecurrenceStatus = "agendada" | "atrasada" | "proxima" | "em_dia" | "inativa" | "sem_visita";

export const RECURRENCE_META: Record<RecurrenceStatus, { label: string; tone: Tone; order: number }> = {
  atrasada:   { label: "Retorno atrasado", tone: "red",   order: 0 },
  proxima:    { label: "Retorno próximo",  tone: "gold",  order: 1 },
  inativa:    { label: "Inativo",          tone: "gray",  order: 2 },
  agendada:   { label: "Já agendado",      tone: "blue",  order: 3 },
  em_dia:     { label: "Em dia",           tone: "green", order: 4 },
  sem_visita: { label: "Sem atendimentos", tone: "gray",  order: 5 },
};

const DEFAULT_INTERVAL = 30;
const SOON_DAYS = 7;

export type Recurrence = {
  status: RecurrenceStatus;
  /** Intervalo esperado entre visitas (dias). */
  interval: number;
  /** Se o intervalo vem do histórico real do cliente. */
  learned: boolean;
  lastVisit: string | null;
  dueDate: string | null;
  daysSinceLast: number | null;
  daysUntilDue: number | null;
};

/**
 * Estima quando a cliente deveria voltar: usa o intervalo médio real entre
 * visitas; sem histórico suficiente, usa o retorno sugerido do último serviço.
 */
export function computeRecurrence(stats: ClientStats | undefined, serviceReturnDays: number | null | undefined, today: string): Recurrence {
  const avg = stats?.avg_interval_days ? Math.round(Number(stats.avg_interval_days)) : null;
  const learned = Boolean(avg && avg >= 3);
  const interval = learned ? avg! : serviceReturnDays ?? DEFAULT_INTERVAL;

  if (!stats?.last_visit) {
    return { status: "sem_visita", interval, learned, lastVisit: null, dueDate: null, daysSinceLast: null, daysUntilDue: null };
  }

  const lastVisit = dateSP(stats.last_visit);
  const dueDate = addDays(lastVisit, interval);
  const daysSinceLast = diffDays(lastVisit, today);
  const daysUntilDue = diffDays(today, dueDate);

  let status: RecurrenceStatus;
  if (stats.next_appointment) status = "agendada";
  else if (daysSinceLast > Math.max(90, interval * 3)) status = "inativa";
  else if (daysUntilDue < 0) status = "atrasada";
  else if (daysUntilDue <= SOON_DAYS) status = "proxima";
  else status = "em_dia";

  return { status, interval, learned, lastVisit, dueDate, daysSinceLast, daysUntilDue };
}
