import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_HOURS } from "./hours";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  clinic_name: "Talissa Estética e Bem Estar",
  whatsapp: "551165782211",
  address: "Av. Paulista, 1337 - Bela Vista, São Paulo — SP",
  business_hours: DEFAULT_HOURS,
  slot_step_min: 30,
  min_lead_min: 60,
  max_days_ahead: 90,
  cancel_min_hours: 24,
  fee_credit: 3.5,
  fee_debit: 1.5,
  templates: {
    confirmacao: "Olá, {nome}! Aqui é da {clinica} 🌸 Passando para confirmar seu horário de {servico} em {data} às {hora}. Podemos confirmar?",
    lembrete: "Oi, {nome}! Lembrete do seu horário amanhã ({data}) às {hora} para {servico}. Te esperamos! 💕 Se precisar remarcar: {link}",
    pos_atendimento: "Oi, {nome}! Obrigada pela visita hoje 💕 Como você está se sentindo depois do {servico}? Qualquer dúvida sobre os cuidados em casa, é só chamar.",
    retorno: "Oi, {nome}! Tudo bem? Aqui é da {clinica} 🌸 Já está na hora da sua próxima sessão de {servico}. Quer que eu reserve um horário para você?",
    reativacao: "Oi, {nome}! Que saudade 💕 Faz tempo que você não vem aqui na {clinica}. Que tal agendar um momento de cuidado? Temos horários esta semana!",
    aniversario: "Feliz aniversário, {nome}! 🎉💕 Toda a equipe da {clinica} deseja um dia lindo para você!",
  },
};

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

/** Taxa (em R$) da maquininha para a forma de pagamento. */
export function cardFee(settings: Settings, method: string, amount: number) {
  const pct = method === "credito" ? settings.fee_credit : method === "debito" ? settings.fee_debit : 0;
  return Math.round(amount * pct) / 100;
}
