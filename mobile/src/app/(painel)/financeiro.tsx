import { useQuery } from "@powersync/react-native";
import { brl, dateSP, fmtDate, lastDayOfMonth, METHOD_LABEL, monthName, shiftMonth, todaySP } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import { router } from "expo-router";
import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, ChevronLeft, ChevronRight, Download, Plus, Scale, Wallet } from "lucide-react-native";
import { Text, View } from "react-native";
import { BarList, DailyBars, DataTable, MonthlyChart, Split } from "@/components/charts";
import { Badge, Button, Card, ConfirmButton, Empty, ListItem, Row, Screen, Segmented, Stat, Tabs, useToast, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { ts } from "@/lib/agenda";
import { shareCsv } from "@/lib/export";
import { group, sum } from "@/lib/finance";

type Tx = { id: string; kind: string; category: string; description: string | null; amount: number; method: string; occurred_on: string; status: string; due_on: string | null; fee: number; client_name: string | null; service_name: string | null };
const KINDS = [{ value: "todos", label: "Todos" }, { value: "receita", label: "Receitas" }, { value: "despesa", label: "Despesas" }];
const mono = { fontFamily: Font.body, fontVariant: ["tabular-nums" as const] };

/** Financeiro do mês: totais, contas a pagar/receber, lançamentos e demonstrativo. */
export default function Financeiro() {
  const toast = useToast();
  const settings = useSettings();
  const today = todaySP();
  const [ym, setYm] = useState(today.slice(0, 7));
  const wide = useWide();
  const [tab, setTab] = useState("visao");
  const [kindFilter, setKindFilter] = useState("todos");
  const last = lastDayOfMonth(ym);
  const { data: txs } = useQuery<Tx>(
    "select t.*, c.name as client_name, (select s.name from appointments a join services s on s.id = a.service_id where a.id = t.appointment_id) as service_name from transactions t left join clients c on c.id = t.client_id where t.occurred_on between ? and ? order by t.occurred_on desc, t.created_at desc",
    [`${ym}-01`, last],
  );
  const { data: pending } = useQuery<Tx>("select t.*, c.name as client_name from transactions t left join clients c on c.id = t.client_id where t.status = 'pendente' order by t.due_on");
  const { data: year } = useQuery<{ m: string; kind: string; a: number; f: number }>(
    "select substr(occurred_on, 1, 7) as m, kind, sum(amount) as a, sum(fee) as f from transactions where status = 'pago' and occurred_on between ? and ? group by 1, 2",
    [`${shiftMonth(ym, -11)}-01`, last],
  );

  const { data: unpaid } = useQuery<{ id: string; price: number; starts_at: string; client_name: string | null; service_name: string | null }>(
    `select a.id, a.price, ${ts("a.starts_at")} as starts_at, c.name as client_name, s.name as service_name from appointments a
     left join clients c on c.id = a.client_id left join services s on s.id = a.service_id
     where a.status = 'concluido' and a.client_package_id is null and a.price > 0 and coalesce(a.voucher_amount, 0) < a.price
     and date(a.starts_at, '-3 hours') between ? and ? and not exists (select 1 from transactions t where t.appointment_id = a.id) order by a.starts_at`,
    [`${ym}-01`, last],
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
    ...group(expenses, (t) => t.category, (t) => t.amount).slice(0, 6).map((g) => [`(−) ${g.label}`, -g.value, false] as [string, number, boolean]),
    ["= Resultado", result, true],
  ];

  const markPaid = (t: Tx) => write(async (w) => {
    await w.update("transactions", t.id, { status: "pago", occurred_on: today, fee: t.kind === "receita" ? cardFee(settings, t.method, t.amount) : 0 });
    toast(t.kind === "receita" ? "Recebimento registrado." : "Pagamento registrado.");
  });
  /** Exporta os lançamentos do mês (mesmas colunas do painel). */
  const exportCsv = () => shareCsv(`financeiro-${ym}.csv`,
    ["Data", "Tipo", "Situação", "Categoria", "Descrição", "Cliente", "Forma", "Valor", "Taxa", "Líquido", "Vencimento"],
    [...txs].reverse().map((t) => [fmtDate(t.occurred_on), t.kind === "receita" ? "Receita" : "Despesa", t.status === "pago" ? "Pago" : "Pendente", t.category, t.description, t.client_name,
      METHOD_LABEL[t.method as keyof typeof METHOD_LABEL], Number(t.amount), Number(t.fee), Number(t.amount) - Number(t.fee), t.due_on ? fmtDate(t.due_on) : ""]),
  ).catch(() => toast("Não foi possível exportar.", "error"));
  const remove = (id: string) => write((w) => w.remove("transactions", id));

  const listed = kindFilter === "todos" ? txs : txs.filter((t) => t.kind === kindFilter);
  const toReceive = pending.filter((t) => t.kind === "receita");
  const toPay = pending.filter((t) => t.kind === "despesa");
  const days = Array.from({ length: Number(last.slice(8)) }, (_, i) => ({ day: i + 1, value: sum(income.filter((t) => Number(t.occurred_on.slice(8)) === i + 1), (t) => t.amount) }));
  const novo = (kind: string) => router.push({ pathname: "/financeiro/novo", params: { kind } });
  const method = (t: Tx) => METHOD_LABEL[t.method as keyof typeof METHOD_LABEL];
  const value = (t: Tx) => <Text style={[mono, { fontFamily: Font.bold, fontSize: 14, color: t.kind === "despesa" ? Brand.danger : "#1F6B3A" }]}>{`${t.kind === "despesa" ? "− " : "+ "}${brl(t.amount)}`}</Text>;

  return (
    <Screen
      eyebrow="Financeiro" title={monthName(ym)} subtitle="Caixa realizado, taxas de cartão e contas a pagar e receber."
      right={
        <>
          <Button small variant="outline" icon={ChevronLeft} onPress={() => setYm(shiftMonth(ym, -1))}>{""}</Button>
          <Button small variant="outline" onPress={() => setYm(today.slice(0, 7))}>Mês atual</Button>
          <Button small variant="outline" icon={ChevronRight} onPress={() => setYm(shiftMonth(ym, 1))}>{""}</Button>
          <Button small variant="outline" icon={Download} onPress={exportCsv}>CSV</Button>
          <Button small variant="outline" icon={ArrowDownCircle} onPress={() => novo("despesa")}>Despesa</Button>
          <Button small icon={Plus} onPress={() => novo("receita")}>Receita</Button>
        </>
      }
    >
      <Row wrap gap={12}>
        <Stat dark icon={Scale} label="Resultado do mês" value={brl(result)} hint={gross ? `margem ${Math.round((result / gross) * 100)}%` : "sem receitas"} />
        <Stat icon={ArrowUpCircle} label="Receita bruta" value={brl(gross)} hint={`${income.length} recebimentos`} />
        <Stat icon={Wallet} label="Receita líquida" value={brl(gross - fees)} hint={`taxas ${brl(fees)}`} />
        <Stat icon={ArrowDownCircle} label="Despesas" value={brl(out)} hint={`${expenses.length} lançamentos`} />
        <Stat label="A receber / a pagar" value={brl(sum(toReceive, (t) => t.amount))} hint={`a pagar ${brl(sum(toPay, (t) => t.amount))}`} tone={toPay.some((t) => !!t.due_on && t.due_on < today) ? "red" : "bronze"} />
      </Row>
      <Tabs value={tab} onChange={setTab} options={[{ value: "visao", label: "Visão geral" }, { value: "lancamentos", label: `Lançamentos · ${txs.length}` }, { value: "contas", label: `Contas a pagar e receber · ${pending.length}` }]} />

      {tab === "visao" && (
        <>
          {unpaid.length > 0 && (
            <Card gold eyebrow="Confira o caixa" title="Atendimentos sem pagamento registrado" right={<Badge tone="gold">{String(unpaid.length)}</Badge>}>
              {unpaid.map((a) => (
                <ListItem key={a.id} title={`${a.client_name ?? "Cliente"} · ${a.service_name ?? "Atendimento"}`} subtitle={`${fmtDate(dateSP(a.starts_at), { year: undefined })} · ${brl(a.price)}`} onPress={() => router.push(`/agendamento/${a.id}`)} />
              ))}
            </Card>
          )}
          <Split
            left={
              <>
                <Card title="Últimos 12 meses" eyebrow="Líquido x despesas"><MonthlyChart months={months} /></Card>
                <Card title="Receita por dia"><DailyBars days={days} highlight={ym === today.slice(0, 7) ? Number(today.slice(8)) : undefined} /></Card>
                <Card title="Receita por origem"><BarList rows={group(income, (t) => t.service_name ?? t.category, (t) => t.amount)} /></Card>
              </>
            }
            right={
              <>
                <Card title="Demonstrativo do mês" eyebrow="DRE simplificado" bodyStyle={{ gap: 0 }}>
                  {dre.map(([label, v, strong], i) => (
                    <View key={i} style={[{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 }, strong && { borderTopWidth: 1, borderTopColor: "#EAE0D0" }]}>
                      <Text style={{ fontFamily: strong ? Font.bold : Font.body, fontSize: 14, color: strong ? Brand.ink : Brand.body }}>{label}</Text>
                      <Text style={[mono, { fontFamily: strong ? Font.bold : Font.body, fontSize: 14, color: v < 0 ? Brand.danger : Brand.ink }]}>{brl(v)}</Text>
                    </View>
                  ))}
                </Card>
                <Card title="Formas de pagamento"><BarList rows={group(income, (t) => method(t), (t) => t.amount)} /></Card>
                <Card title="Despesas por categoria"><BarList rows={group(expenses, (t) => t.category, (t) => t.amount)} empty="Nenhuma despesa no mês." color="#B39A84" /></Card>
              </>
            }
          />
        </>
      )}

      {tab === "lancamentos" && (
        <Card bodyStyle={{ padding: 0, gap: 0 }}>
          <View style={{ padding: 16 }}><Segmented value={kindFilter} options={KINDS} onChange={setKindFilter} /></View>
          {listed.length === 0 ? <Empty icon={Wallet} text="Nenhum lançamento neste mês." /> : wide ? (
            <DataTable
              cols={[{ label: "Data" }, { label: "Descrição", flex: 2 }, { label: "Categoria", flex: 1.4 }, { label: "Cliente", flex: 1.4 }, { label: "Forma" }, { label: "Situação" }, { label: "Valor", right: true }, { label: "Taxa", right: true }, { label: "", flex: 1.3, right: true }]}
              rows={listed.map((t) => ({
                key: t.id,
                cells: [
                  fmtDate(t.occurred_on, { year: undefined }), t.description ?? "—", t.category, t.client_name ?? "—", method(t),
                  <Badge key="s" tone={t.status === "pago" ? "green" : "gold"}>{t.status === "pago" ? "pago" : "pendente"}</Badge>,
                  value(t), t.fee ? brl(t.fee) : "", <ConfirmButton key="x" confirmText="Excluir" onConfirm={() => remove(t.id)} />,
                ],
              }))}
            />
          ) : listed.map((t) => (
            <ListItem
              key={t.id}
              title={`${t.kind === "despesa" ? "− " : "+ "}${brl(t.amount)} · ${t.description ?? t.category}`}
              subtitle={[fmtDate(t.occurred_on, { year: undefined }), t.category, t.client_name, method(t), t.fee ? `taxa ${brl(t.fee)}` : null].filter(Boolean).join(" · ")}
              right={<Row><Badge tone={t.status === "pago" ? "green" : "gold"}>{t.status === "pago" ? "pago" : "pendente"}</Badge><ConfirmButton onConfirm={() => remove(t.id)} /></Row>}
            />
          ))}
        </Card>
      )}

      {tab === "contas" && (
        <Split ratio={1} left={<Contas title="A receber" kind="receita" items={toReceive} />} right={<Contas title="A pagar" kind="despesa" items={toPay} />} />
      )}
    </Screen>
  );

  /** Cartão de contas em aberto: data grande serifada, descrição, valor e botão de baixa. */
  function Contas({ title, kind, items }: { title: string; kind: "receita" | "despesa"; items: Tx[] }) {
    return (
      <Card title={title} eyebrow={`${items.length} em aberto · ${brl(sum(items, (t) => t.amount))}`} gold={kind === "despesa"} bodyStyle={{ padding: 12 }}>
        {items.length === 0 ? <Empty text="Nada em aberto." /> : items.map((t) => {
          const late = !!t.due_on && t.due_on < today;
          return (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderColor: late ? "#F2C1C1" : "#F0E8DB", backgroundColor: late ? "#FFF6F6" : Brand.white }}>
              <View style={{ width: 44, alignItems: "center" }}>
                <Text style={{ fontFamily: Font.displayRegular, fontSize: 26, lineHeight: 28, color: Brand.ink }}>{t.due_on?.slice(8)}</Text>
                <Text style={{ fontFamily: Font.body, fontSize: 10, color: Brand.muted }}>{monthName((t.due_on ?? ym).slice(0, 7), "short").slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Font.body, fontSize: 14, color: Brand.ink }} numberOfLines={1}>{t.description ?? t.category}</Text>
                <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }} numberOfLines={1}>{t.client_name ?? t.category}{late && <Text style={{ fontFamily: Font.bold, color: Brand.danger }}> · vencida</Text>}</Text>
              </View>
              <Text style={[mono, { fontFamily: Font.bold, fontSize: 14, color: Brand.ink }]}>{brl(t.amount)}</Text>
              <Button small variant="ghost" icon={Check} onPress={() => markPaid(t)}>{kind === "receita" ? "Recebido" : "Pago"}</Button>
            </View>
          );
        })}
      </Card>
    );
  }
}
