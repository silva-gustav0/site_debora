import { useQuery } from "@powersync/react-native";
import { brl, fmtDate, lastDayOfMonth, METHOD_LABEL, monthName, shiftMonth, todaySP } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Badge, Button, Card, ConfirmButton, Empty, ListItem, Row, Screen, Section, Segmented, Stat, Txt, useToast } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { group, sum } from "@/lib/finance";

type Tx = { id: string; kind: string; category: string; description: string | null; amount: number; method: string; occurred_on: string; status: string; due_on: string | null; fee: number; client_name: string | null };
const TABS = [{ value: "visao", label: "Visão geral" }, { value: "lancamentos", label: "Lançamentos" }, { value: "contas", label: "Contas" }];

/** Barras simples dos últimos 12 meses (líquido x despesas). */
function MonthlyChart({ months }: { months: { label: string; income: number; expense: number }[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120, gap: 4 }}>
      {months.map((m) => (
        <View key={m.label + m.income} style={{ flex: 1, alignItems: "center", gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 1 }}>
            <View style={{ width: 8, height: Math.max(2, (m.income / max) * 100), backgroundColor: Brand.bronze, borderRadius: 2 }} />
            <View style={{ width: 8, height: Math.max(2, (m.expense / max) * 100), backgroundColor: "#D8C7B0", borderRadius: 2 }} />
          </View>
          <Txt.muted style={{ fontSize: 10 }}>{m.label}</Txt.muted>
        </View>
      ))}
    </View>
  );
}

/** Financeiro do mês: totais, contas a pagar/receber, lançamentos e demonstrativo. */
export default function Financeiro() {
  const toast = useToast();
  const settings = useSettings();
  const today = todaySP();
  const [ym, setYm] = useState(today.slice(0, 7));
  const [tab, setTab] = useState("visao");
  const last = lastDayOfMonth(ym);
  const { data: txs } = useQuery<Tx>(
    "select t.*, c.name as client_name from transactions t left join clients c on c.id = t.client_id where t.occurred_on between ? and ? order by t.occurred_on desc, t.created_at desc",
    [`${ym}-01`, last],
  );
  const { data: pending } = useQuery<Tx>("select t.*, c.name as client_name from transactions t left join clients c on c.id = t.client_id where t.status = 'pendente' order by t.due_on");
  const { data: year } = useQuery<{ m: string; kind: string; a: number; f: number }>(
    "select substr(occurred_on, 1, 7) as m, kind, sum(amount) as a, sum(fee) as f from transactions where status = 'pago' and occurred_on between ? and ? group by 1, 2",
    [`${shiftMonth(ym, -11)}-01`, last],
  );

  const paid = txs.filter((t) => t.status === "pago");
  const income = paid.filter((t) => t.kind === "receita");
  const expenses = paid.filter((t) => t.kind === "despesa");
  const gross = sum(income, (t) => t.amount);
  const fees = sum(income, (t) => t.fee);
  const out = sum(expenses, (t) => t.amount);
  const result = gross - fees - out;
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(ym, i - 11);
    const of = (k: string) => year.find((y) => y.m === m && y.kind === k);
    return { label: monthName(m, "short"), income: Number(of("receita")?.a ?? 0) - Number(of("receita")?.f ?? 0), expense: Number(of("despesa")?.a ?? 0) };
  });
  const dre: [string, number, boolean][] = [
    ["Receita bruta", gross, false], ["(−) Taxas de cartão", -fees, false], ["= Receita líquida", gross - fees, true],
    ...group(expenses, (t) => t.category, (t) => t.amount).map((g) => [`(−) ${g.label}`, -g.value, false] as [string, number, boolean]),
    ["= Resultado", result, true],
  ];

  const markPaid = (t: Tx) => write(async (w) => {
    await w.update("transactions", t.id, { status: "pago", occurred_on: today, fee: t.kind === "receita" ? cardFee(settings, t.method, t.amount) : 0 });
    toast(t.kind === "receita" ? "Recebimento registrado." : "Pagamento registrado.");
  });
  const remove = (id: string) => write((w) => w.remove("transactions", id));

  return (
    <Screen title="Financeiro" subtitle={monthName(ym)} right={<Button small icon="add" onPress={() => router.push("/financeiro/novo")}>Novo</Button>}>
      <Row>
        <Button small variant="outline" icon="chevron-back" onPress={() => setYm(shiftMonth(ym, -1))}>Anterior</Button>
        <Button small variant="ghost" onPress={() => setYm(today.slice(0, 7))}>Mês atual</Button>
        <Button small variant="outline" icon="chevron-forward" onPress={() => setYm(shiftMonth(ym, 1))}>Próximo</Button>
      </Row>
      <Row wrap>
        <Stat label="Resultado do mês" value={brl(result)} tone={result < 0 ? "red" : "green"} hint={gross ? `margem ${Math.round((result / gross) * 100)}%` : "sem receitas"} />
        <Stat label="Receitas pagas" value={brl(gross)} hint={`${income.length} recebimentos`} />
        <Stat label="Despesas pagas" value={brl(out)} tone="red" hint={`${expenses.length} lançamentos`} />
        <Stat label="Taxas de cartão" value={brl(fees)} tone="gray" />
      </Row>
      <Segmented value={tab} options={TABS} onChange={setTab} />

      {tab === "visao" && (
        <>
          <Card title="Últimos 12 meses" eyebrow="Líquido x despesas"><MonthlyChart months={months} /></Card>
          <Card title="Demonstrativo do mês" eyebrow="DRE simplificado">
            {dre.map(([label, value, strong], i) => (
              <Row key={i} style={{ justifyContent: "space-between" }}>
                {strong ? <Txt.strong>{label}</Txt.strong> : <Txt.muted>{label}</Txt.muted>}
                {strong ? <Txt.strong>{brl(value)}</Txt.strong> : <Txt.body style={value < 0 ? { color: Brand.danger } : undefined}>{brl(value)}</Txt.body>}
              </Row>
            ))}
          </Card>
        </>
      )}

      {tab === "lancamentos" && (txs.length === 0 ? <Empty icon="wallet-outline" text="Nenhum lançamento neste mês." /> : txs.map((t) => (
        <ListItem
          key={t.id}
          title={`${t.kind === "despesa" ? "− " : "+ "}${brl(t.amount)} · ${t.description ?? t.category}`}
          subtitle={[fmtDate(t.occurred_on, { year: undefined }), t.category, t.client_name, METHOD_LABEL[t.method as keyof typeof METHOD_LABEL], t.fee ? `taxa ${brl(t.fee)}` : null].filter(Boolean).join(" · ")}
          right={<Row><Badge tone={t.status === "pago" ? "green" : "gold"}>{t.status === "pago" ? "pago" : "pendente"}</Badge><ConfirmButton onConfirm={() => remove(t.id)} /></Row>}
        />
      )))}

      {tab === "contas" && (["receita", "despesa"] as const).map((kind) => {
        const items = pending.filter((t) => t.kind === kind);
        return (
          <Section key={kind} title={`${kind === "receita" ? "A receber" : "A pagar"} · ${brl(sum(items, (t) => t.amount))}`}>
            {items.length === 0 ? <Empty text="Nada em aberto." /> : items.map((t) => {
              const late = !!t.due_on && t.due_on < today;
              return (
                <ListItem
                  key={t.id}
                  title={`${brl(t.amount)} · ${t.description ?? t.category}`}
                  subtitle={`${t.client_name ?? t.category} · vence ${fmtDate(t.due_on, { year: undefined })}${late ? " · vencida" : ""}`}
                  right={<Button small variant="outline" icon="checkmark" onPress={() => markPaid(t)}>{kind === "receita" ? "Recebido" : "Pago"}</Button>}
                />
              );
            })}
          </Section>
        );
      })}
    </Screen>
  );
}
