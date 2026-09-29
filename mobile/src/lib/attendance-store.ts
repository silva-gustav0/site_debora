import { File, Paths } from "expo-file-system";

export type Clock = { startedAt: number; pausedAt: number | null; pausedTotal: number; extraMin: number; alerted: boolean };
export type Notes = { chips: Record<string, string[]>; text: string };
export type Saved = { clock: Clock | null; notes: Notes };

const file = (id: string) => new File(Paths.document, `atendimento-${id}.json`);

/** Lê o cronômetro e as anotações salvos do atendimento (nulo se não houver). */
export function loadAttendance(id: string): Saved | null {
  try { const f = file(id); return f.exists ? (JSON.parse(f.textSync()) as Saved) : null; } catch { return null; }
}

/** Grava o cronômetro e as anotações do atendimento no diretório do app. */
export function saveAttendance(id: string, data: Saved) {
  try { file(id).write(JSON.stringify(data)); } catch {}
}

/** Apaga os dados salvos do atendimento. */
export function clearAttendance(id: string) {
  try { const f = file(id); if (f.exists) f.delete(); } catch {}
}
