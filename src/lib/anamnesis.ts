import { allQuestions, matchOption, type AnamnesisFormDef, type AnswerValue } from "./anamnesis-schema";
import { str } from "./form";
import type { Anamnesis } from "./types";

/** Resposta de uma pergunta lida do formulário (só valores permitidos pelo modelo). */
function readAnswer(fd: FormData, q: ReturnType<typeof allQuestions>[number]): AnswerValue {
  const key = `q_${q.id}`;
  switch (q.type) {
    case "yes_no": return fd.get(key) === "sim" ? true : fd.get(key) === "nao" ? false : undefined;
    case "multi": return fd.getAll(key).map(String).filter((v) => q.options?.includes(v)).slice(0, 40);
    case "choice": { const v = str(fd, key, 120); return q.options?.includes(v) ? v : undefined; }
    case "text": return str(fd, key, 300) || undefined;
    case "long_text": return str(fd, key, 1500) || undefined;
  }
}

/**
 * Lê a ficha do formulário conforme o modelo e devolve as colunas do cliente a atualizar
 * (usada pela equipe e pelo link do cliente). Respostas de perguntas que saíram do modelo são mantidas.
 */
export function anamnesisUpdate(fd: FormData, filledBy: "equipe" | "cliente", form: AnamnesisFormDef, previous: Anamnesis | null) {
  const answers = Object.fromEntries(allQuestions(form).map((q) => [q.id, readAnswer(fd, q)]));
  return anamnesisFromAnswers(answers, filledBy, form, previous);
}

/** Monta a ficha e o resumo de saúde a partir das respostas já lidas (site e app). */
export function anamnesisFromAnswers(
  given: Record<string, AnswerValue>, filledBy: "equipe" | "cliente", form: AnamnesisFormDef, previous: Anamnesis | null,
) {
  const questions = allQuestions(form);
  const answers: Record<string, AnswerValue> = { ...(previous ?? {}) };
  for (const q of questions) answers[q.id] = given[q.id];
  const anamnesis = { ...answers, filled_by: filledBy, filled_at: new Date().toISOString() } as Anamnesis;

  const text = (id: string) => { const v = answers[id]; return typeof v === "string" && v ? v : null; };
  const alerts = questions.filter((q) => q.alert).flatMap((q) => {
    const v = answers[q.id];
    if (q.type === "yes_no") return v === true ? [q.label] : [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string" && v) return [q.type === "choice" ? `${q.label}: ${matchOption(q.options, v)}` : `${q.label}: ${v}`];
    return [];
  });
  return {
    anamnesis,
    skin_type: text("skin_type"),
    allergies: text("allergies_detail"),
    health_notes: alerts.join(" · ") || null,
  };
}
