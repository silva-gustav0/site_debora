// Padrões e cálculos das configurações, sem acesso ao banco: usados pelo site e pelo app.
import { DEFAULT_HOURS } from "./hours";
import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  clinic_name: "Clínica Débora Silva",
  whatsapp: "551165782211",
  address: "Av. Paulista, 1337 - Bela Vista, São Paulo — SP",
  business_hours: DEFAULT_HOURS,
  slot_step_min: 30,
  min_lead_min: 60,
  max_days_ahead: 90,
  cancel_min_hours: 24,
  fee_credit: 3.5,
  fee_debit: 1.5,
  anamnesis_form: null,
  consent_text: null,
  templates: {
    confirmacao: "Olá, {nome}! Aqui é da {clinica} 🌸 Passando para confirmar seu horário de {servico} em {data} às {hora}. Podemos confirmar?",
    lembrete: "Oi, {nome}! Lembrete do seu horário amanhã ({data}) às {hora} para {servico}. Te esperamos! 💕 Se precisar remarcar: {link}",
    pos_atendimento: "Oi, {nome}! Obrigada pela visita hoje 💕 Como você está se sentindo depois do {servico}? Qualquer dúvida sobre os cuidados em casa, é só chamar.",
    retorno: "Oi, {nome}! Tudo bem? Aqui é da {clinica} 🌸 Já está na hora da sua próxima sessão de {servico}. Quer que eu reserve um horário para você?",
    reativacao: "Oi, {nome}! Que saudade 💕 Faz tempo que você não vem aqui na {clinica}. Que tal agendar um momento de cuidado? Temos horários esta semana!",
    aniversario: "Feliz aniversário, {nome}! 🎉💕 A {clinica} deseja um dia lindo para você!",
  },
};

/** Taxa (em R$) da maquininha para a forma de pagamento. */
export function cardFee(settings: Settings, method: string, amount: number) {
  const pct = method === "credito" ? settings.fee_credit : method === "debito" ? settings.fee_debit : 0;
  return Math.round(amount * pct) / 100;
}
