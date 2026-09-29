import { addDays, METHOD_LABEL } from "@shared/format";
import type { PaymentMethod } from "@shared/types";

export const CATEGORIES = {
  receita: ["Atendimento", "Pacotes", "Venda de produtos", "Outras receitas"],
  despesa: ["Aluguel", "Produtos e insumos", "Energia", "Água", "Internet e telefone", "Marketing", "Equipamentos", "Manutenção", "Impostos e taxas", "Contador", "Cursos", "Pró-labore", "Outros"],
};

export const METHOD_OPTIONS = (Object.keys(METHOD_LABEL) as PaymentMethod[]).map((value) => ({ value, label: METHOD_LABEL[value] }));

export const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

/** Soma por rótulo, do maior para o menor. */
export function group<T>(xs: T[], key: (x: T) => string, value: (x: T) => number) {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + value(x));
  return [...m.entries()].map(([label, v]) => ({ label, value: v })).sort((a, b) => b.value - a.value);
}

/** Divide o valor em parcelas mensais (a última leva a diferença de centavos). */
export const installmentsOf = (amount: number, n: number, date: string) => {
  const per = Math.floor((amount / n) * 100) / 100;
  return Array.from({ length: n }, (_, i) => ({
    value: i === n - 1 ? Math.round((amount - per * (n - 1)) * 100) / 100 : per,
    due: addDays(date, 30 * i),
  }));
};

export const qtyFmt = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
