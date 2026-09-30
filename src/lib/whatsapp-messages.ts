// Mensagens prontas para a Débora mandar pelo WhatsApp (painel e app), sempre com o primeiro nome da cliente.
import { fillTemplate } from "./format";
import type { Settings } from "./types";

/** Primeiro nome "bonito": "DEBORA BATISTA" → "Debora", "ana paula" → "Ana". */
export function niceFirstName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first ? first.charAt(0).toLocaleUpperCase("pt-BR") + first.slice(1).toLocaleLowerCase("pt-BR") : "";
}

export type Suggestion = { title: string; text: string };

const REACTIVATION = [
  { title: "Saudade", text: "Oi, {nome}! Que saudade 💕 Faz tempo que você não vem aqui na {clinica}. Que tal reservar um momento de cuidado só seu? Tenho horários esta semana!" },
  { title: "Novidades", text: "Oi, {nome}, tudo bem? Aqui é a Débora, da {clinica} 🌸 Estamos com novidades e horários especiais este mês. Quer que eu te conte e já reserve um horário?" },
  { title: "Cuidado com a pele", text: "Oi, {nome}! Passando para lembrar de você 💛 A troca de estação pede um cuidado extra com a pele. Posso te encaixar para uma limpeza ou hidratação esta semana?" },
  { title: "Curta e direta", text: "Oi, {nome}! Aqui é a Débora 🌸 Sentimos sua falta! Quer agendar um horário? É só me responder aqui." },
];

/** Sugestões para uma cliente: reativação (variações), retorno e, no mês do aniversário, a de parabéns. */
export function suggestionsFor(client: { name: string; birth_date?: string | null }, settings: Pick<Settings, "templates" | "clinic_name">, month: string): Suggestion[] {
  const vars = { nome: niceFirstName(client.name), clinica: settings.clinic_name, servico: "tratamento" };
  const list: Suggestion[] = [
    ...(client.birth_date?.slice(5, 7) === month ? [{ title: "Aniversário", text: settings.templates.aniversario }] : []),
    { title: "Reativação (modelo da clínica)", text: settings.templates.reativacao },
    ...REACTIVATION,
    { title: "Retorno", text: settings.templates.retorno },
  ];
  return list.map((s) => ({ title: s.title, text: fillTemplate(s.text, vars) }));
}
