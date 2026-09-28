import { todaySP } from "./format";

/** Modelos de campanhas por data comemorativa: preenchem o formulário de nova promoção. */
export type PromoTemplate = {
  key: string;
  name: string;
  label: string;
  title: string;
  description: string;
  notice: string;
  cta: string;
  /** Período da campanha no ano informado (datas ISO). */
  period?: (year: number) => [string, string];
};

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** n-ésimo dia da semana (0 = domingo) de um mês. */
function nthWeekday(y: number, m: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  return 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
}

function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const PROMO_TEMPLATES: PromoTemplate[] = [
  {
    key: "mulher", name: "Mês da Mulher", label: "Mês da Mulher",
    title: "Março é para você se cuidar",
    description: "Condição especial em limpeza de pele e massagem durante todo o mês de março.",
    notice: "Condição especial em março", cta: "Quero aproveitar",
    period: (y) => [iso(y, 3, 1), iso(y, 3, 31)],
  },
  {
    key: "maes", name: "Dia das Mães", label: "Dia das Mães",
    title: "Presenteie com um momento de cuidado",
    description: "Vale-presente e combos especiais para comemorar o Dia das Mães.",
    notice: "Presenteie com cuidado", cta: "Garantir o presente",
    period: (y) => { const d = iso(y, 5, nthWeekday(y, 5, 0, 2)); return [shift(d, -14), d]; },
  },
  {
    key: "namorados", name: "Dia dos Namorados", label: "Dia dos Namorados",
    title: "Massagem relaxante a dois",
    description: "Um presente diferente para quem você ama: relaxamento em dupla com preço especial.",
    notice: "Massagem a dois", cta: "Agendar a dois",
    period: (y) => [iso(y, 6, 1), iso(y, 6, 12)],
  },
  {
    key: "pais", name: "Dia dos Pais", label: "Dia dos Pais",
    title: "Cuidado também é para ele",
    description: "Limpeza de pele e massagem com condição especial no mês do Dia dos Pais.",
    notice: "Condição especial para ele", cta: "Garantir o presente",
    period: (y) => { const d = iso(y, 8, nthWeekday(y, 8, 0, 2)); return [shift(d, -14), d]; },
  },
  {
    key: "cliente", name: "Semana do Cliente", label: "Semana do Cliente",
    title: "Obrigada por cuidar de você com a gente",
    description: "Na semana do cliente, todos os procedimentos com condição especial.",
    notice: "Condições especiais", cta: "Aproveitar oferta",
    period: (y) => [iso(y, 9, 9), iso(y, 9, 15)],
  },
  {
    key: "professores", name: "Mês dos Professores", label: "Mês dos Professores",
    title: "Quem ensina merece se cuidar",
    description: "Profissionais da educação têm condição especial durante todo o mês de outubro. Basta apresentar um comprovante.",
    notice: "Condição especial para quem ensina", cta: "Quero aproveitar",
    period: (y) => [iso(y, 10, 1), iso(y, 10, 31)],
  },
  {
    key: "blackfriday", name: "Black Friday", label: "Black Friday",
    title: "Os melhores preços do ano",
    description: "Descontos em todos os procedimentos por tempo limitado.",
    notice: "Os melhores preços do ano", cta: "Ver oferta",
    period: (y) => { const d = iso(y, 11, nthWeekday(y, 11, 5, 4)); return [shift(d, -4), shift(d, 3)]; },
  },
  {
    key: "natal", name: "Natal", label: "Especial de Natal",
    title: "Dê bem-estar de presente",
    description: "Vale-presente e combos especiais para o fim de ano.",
    notice: "Dê bem-estar de presente", cta: "Garantir o presente",
    period: (y) => [iso(y, 12, 1), iso(y, 12, 24)],
  },
  {
    key: "aniversario", name: "Aniversariante do mês", label: "Aniversariante do mês",
    title: "Seu aniversário merece um presente",
    description: "Desconto especial em qualquer procedimento no mês do seu aniversário.",
    notice: "Desconto especial no mês do seu aniversário", cta: "Quero meu presente",
  },
];

/** Datas da próxima campanha: a deste ano, ou a do ano que vem se esta já passou. */
export function templateDates(t: PromoTemplate, today = todaySP()): [string, string] | null {
  if (!t.period) return null;
  const year = Number(today.slice(0, 4));
  const current = t.period(year);
  return current[1] >= today ? current : t.period(year + 1);
}
