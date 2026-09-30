// Desconto de boas-vindas para clientes novas que se cadastram no site (usado no site, no painel e no app).
import { brl } from "./format";

export const WELCOME_PCT = 5;

/** Valor com o desconto aplicado (centavos arredondados). */
export const withDiscount = (price: number, pct: number) => Math.round(price * (1 - pct / 100) * 100) / 100;

/** Texto curto do desconto para o atendimento: "5% de boas-vindas (−R$ 7,50)". */
export const discountLabel = (price: number, pct: number) =>
  `${pct.toLocaleString("pt-BR")}% de boas-vindas${price > 0 ? ` (−${brl(price - withDiscount(price, pct))})` : ""}`;
