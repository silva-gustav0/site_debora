import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, Check, ChevronLeft, ChevronRight, Download, Plus, Scale, Trash2, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { dayStart } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { addDays, brl, dateSP, fmtDate, lastDayOfMonth, METHOD_LABEL, monthName, shiftMonth, todaySP } from "@/lib/format";
import ActionForm from "@/components/painel/ActionForm";
import ConfirmButton from "@/components/painel/ConfirmButton";
import Drawer from "@/components/painel/Drawer";
import SubmitButton from "@/components/painel/SubmitButton";
import { BarList, DailyBars, MonthlyChart } from "@/components/painel/charts";
import { Badge, Card, Chips, EmptyState, PageHeader, StatTile, Tabs } from "@/components/painel/ui";
import { createTransaction, deleteTransaction, markTransactionPaid } from "../../actions";
import type { PaymentMethod, TransactionRow } from "@/lib/types";

export const metadata = { title: "Financeiro" };

type Tx = TransactionRow & { clients: { id: string; name: string } | null; appointments: { services: { name: string } | null } | null };

const CATEGORIES = {
  receita: ["Atendimento", "Pacotes", "Venda de produtos", "Outras receitas"],
  despesa: ["Aluguel", "Produtos e insumos", "Energia", "Água", "Internet e telefone", "Marketing", "Equipamentos", "Manutenção", "Impostos e taxas", "Contador", "Cursos", "Pró-labore", "Outros"],
};

function group<T>(items: T[], key: (t: T) => string, value: (t: T) => number) {
  const m = new Map<string, number>();
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + value(it));
  return [...m.entries()].map(([label, v]) => ({ label, value: v })).sort((a, b) => b.value - a.value);
}

export default async function FinancePage({ searchParams }: PageProps<"/painel/financeiro">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const ym = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const tab = ["visao", "lancamentos", "contas"].includes(String(sp.tab)) ? String(sp.tab) : "visao";
  const kindFilter = sp.tipo === "receita" || sp.tipo === "despesa" ? sp.tipo : null;
  const first = `${ym}-01`;
  const last = lastDayOfMonth(ym);

  const [txRes, yearRes, apptRes, pendingRes, clientsRes, settings] = await Promise.all([
    supabase.from("transactions").select("*, clients(id, name), appointments(services(name))")
      .gte("occurred_on", first).lte("occurred_on", last).order("occurred_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("transactions").select("kind, amount, fee, occurred_on").eq("status", "pago")
      .gte("occurred_on", `${shiftMonth(ym, -11)}-01`).lte("occurred_on", last),
    supabase.from("appointments").select("id, price, client_id, starts_at, client_package_id, clients(name), services(name), transactions(id)")
      .eq("status", "concluido").gte("starts_at", dayStart(first)).lt("starts_at", dayStart(addDays(last, 1))),
    supabase.from("transactions").select("*, clients(id, name)").eq("status", "pendente").order("due_on"),
    supabase.from("clients").select("id, name").order("name"),
    getSettings(supabase),
  ]);

  const txs = (txRes.data ?? []) as unknown as Tx[];
  const paid = txs.filter((t) => t.status === "pago");
  const income = paid.filter((t) => t.kind === "receita");
  const expenses = paid.filter((t) => t.kind === "despesa");
  const gross = income.reduce((s, t) => s + Number(t.amount), 0);
  const fees = income.reduce((s, t) => s + Number(t.fee), 0);
  const net = gross - fees;
  const totalOut = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const result = net - totalOut;
  const margin = gross ? Math.round((result / gross) * 100) : null;

  const year = yearRes.data ?? [];
  const monthsData = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(ym, i - 11);
    const rows = year.filter((t) => t.occurred_on.startsWith(m));
    return {
      label: monthName(m, "short"),
      income: rows.filter((t) => t.kind === "receita").reduce((s, t) => s + Number(t.amount) - Number(t.fee), 0),
      expense: rows.filter((t) => t.kind === "despesa").reduce((s, t) => s + Number(t.amount), 0),
    };
  });
  const prevNet = monthsData[10].income;
  const trend = prevNet ? Math.round(((net - prevNet) / prevNet) * 100) : null;

  type DoneAppt = { id: string; price: number; client_id: string; starts_at: string; client_package_id: string | null; clients: { name: string } | null; services: { name: string } | null; transactions: { id: string }[] };
  const done = (apptRes.data ?? []) as unknown as DoneAppt[];
  const unpaid = done.filter((a) => a.transactions.length === 0 && !a.client_package_id && Number(a.price) > 0);
  const ticket = done.length ? income.filter((t) => t.appointment_id).reduce((s, t) => s + Number(t.amount), 0) / Math.max(done.filter((a) => !a.client_package_id).length, 1) : 0;

  const days = Array.from({ length: Number(last.slice(8)) }, (_, i) => ({ day: i + 1, value: 0 }));
  for (const t of income) days[Number(t.occurred_on.slice(8)) - 1].value += Number(t.amount);

  const pending = (pendingRes.data ?? []) as unknown as Tx[];
  const toReceive = pending.filter((t) => t.kind === "receita");
  const toPay = pending.filter((t) => t.kind === "despesa");
  const sum = (xs: Tx[]) => xs.reduce((s, t) => s + Number(t.amount), 0);

  const base = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string | null> = { m: ym === today.slice(0, 7) ? null : ym, tab: tab === "visao" ? null : tab, tipo: kindFilter, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    return `/painel/financeiro${p.toString() ? `?${p}` : ""}`;
  };
  const listed = kindFilter ? txs.filter((t) => t.kind === kindFilter) : txs;
  const newKind = sp.novo === "despesa" ? "despesa" : sp.novo === "receita" ? "receita" : null;

  return (
    <>
      <PageHeader
        eyebrow="Financeiro"
        title={monthName(ym)}
        subtitle="Caixa realizado, taxas de cartão e contas a pagar e receber."
        actions={
          <>
            <div className="flex items-center gap-1">
              <Link href={`/painel/financeiro?m=${shiftMonth(ym, -1)}${tab !== "visao" ? `&tab=${tab}` : ""}`} className="p-btn-ghost" aria-label="Mês anterior"><ChevronLeft size={16} /></Link>
              <Link href={`/painel/financeiro${tab !== "visao" ? `?tab=${tab}` : ""}`} className="p-btn-ghost">Mês atual</Link>
              <Link href={`/painel/financeiro?m=${shiftMonth(ym, 1)}${tab !== "visao" ? `&tab=${tab}` : ""}`} className="p-btn-ghost" aria-label="Próximo mês"><ChevronRight size={16} /></Link>
            </div>
            <a href={`/painel/financeiro/exportar?m=${ym}`} className="p-btn-ghost"><Download size={14} /> CSV</a>
            <Link href={base({ novo: "despesa" })} scroll={false} className="p-btn-ghost"><ArrowDownCircle size={14} /> Despesa</Link>
            <Link href={base({ novo: "receita" })} scroll={false} className="p-btn"><Plus size={14} /> Receita</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 lg:col-span-1">
          <StatTile tone="dark" label="Resultado do mês" value={brl(result)} hint={margin !== null ? `margem ${margin}%` : "sem receitas"} icon={Scale} />
        </div>
        <StatTile label="Receita bruta" value={brl(gross)} hint={`${income.length} recebimentos`} icon={ArrowUpCircle} />
        <StatTile label="Receita líquida" value={brl(net)} trend={trend} hint={`taxas ${brl(fees)}`} icon={Wallet} />
        <StatTile label="Despesas" value={brl(totalOut)} hint={`${expenses.length} lançamentos`} icon={ArrowDownCircle} />
        <StatTile label="A receber / a pagar" value={<span className="text-[1.6rem]">{brl(sum(toReceive))}</span>} hint={`a pagar ${brl(sum(toPay))}`} tone={toPay.some((t) => t.due_on! < today) ? "warn" : "default"} href={base({ tab: "contas" })} />
      </div>

      <Tabs
        current={tab}
        tabs={[
          { key: "visao", label: "Visão geral", href: base({ tab: null }) },
          { key: "lancamentos", label: `Lançamentos · ${txs.length}`, href: base({ tab: "lancamentos" }) },
          { key: "contas", label: `Contas a pagar e receber · ${pending.length}`, href: base({ tab: "contas" }) },
        ]}
      />

      {tab === "visao" && (
        <>
          {unpaid.length > 0 && (
            <Card title="Atendimentos sem pagamento registrado" eyebrow="Confira o caixa" gold action={<Badge tone="gold">{unpaid.length}</Badge>} className="mb-5">
              <ul className="flex flex-col divide-y divide-[#F5EEE3]">
                {unpaid.map((a) => (
                  <li key={a.id} className="py-2.5">
                    <ActionForm action={createTransaction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="kind" value="receita" />
                      <input type="hidden" name="appointment_id" value={a.id} />
                      <input type="hidden" name="client_id" value={a.client_id} />
                      <input type="hidden" name="category" value="Atendimento" />
                      <input type="hidden" name="description" value={a.services?.name ?? ""} />
                      <input type="hidden" name="occurred_on" value={dateSP(a.starts_at)} />
                      <span className="flex-1 min-w-48 text-sm">
                        <Link href={`/painel/clientes/${a.client_id}`} className="text-[#2B221B] hover:underline">{a.clients?.name}</Link>
                        <span className="text-[#857566]"> · {a.services?.name} · {fmtDate(a.starts_at, { year: undefined })}</span>
                      </span>
                      <input name="amount" inputMode="decimal" defaultValue={String(a.price).replace(".", ",")} className="p-input w-28 p-num" aria-label="Valor" />
                      <select name="method" defaultValue="pix" className="p-input w-36" aria-label="Forma de pagamento">
                        {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <SubmitButton className="p-btn p-btn-sm">Registrar</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-5 mb-5">
            <Card title="Últimos 12 meses" eyebrow="Líquido x despesas" className="lg:col-span-2"><MonthlyChart months={monthsData} /></Card>
            <Card title="Demonstrativo do mês" eyebrow="DRE simplificado">
              <dl className="text-sm flex flex-col">
                {[
                  ["Receita bruta", gross, false],
                  ["(−) Taxas de cartão", -fees, false],
                  ["= Receita líquida", net, true],
                  ...group(expenses, (t) => t.category, (t) => Number(t.amount)).slice(0, 6).map((g) => [`(−) ${g.label}`, -g.value, false] as const),
                  ["= Resultado", result, true],
                ].map(([label, value, strong], i) => (
                  <div key={i} className={`flex justify-between py-1.5 ${strong ? "border-t border-[#EAE0D0] font-bold" : ""}`}>
                    <dt className={strong ? "text-[#2B221B]" : "text-[#6B5A4B]"}>{label as string}</dt>
                    <dd className={`p-num ${Number(value) < 0 ? "text-[#9B2C2C]" : ""}`}>{brl(value as number)}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-[11px] text-[#A69885] mt-3">Ticket médio por atendimento avulso: {brl(ticket)}</p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card title="Receita por dia" className="lg:col-span-2">
              <DailyBars days={days} highlight={ym === today.slice(0, 7) ? Number(today.slice(8)) : undefined} />
            </Card>
            <Card title="Formas de pagamento"><BarList rows={group(income, (t) => METHOD_LABEL[t.method as PaymentMethod], (t) => Number(t.amount))} /></Card>
            <Card title="Receita por origem" className="lg:col-span-2">
              <BarList rows={group(income, (t) => t.appointments?.services?.name ?? t.category, (t) => Number(t.amount))} />
            </Card>
            <Card title="Despesas por categoria"><BarList rows={group(expenses, (t) => t.category, (t) => Number(t.amount))} empty="Nenhuma despesa no mês." color="#B39A84" /></Card>
          </div>
        </>
      )}

      {tab === "lancamentos" && (
        <Card bodyClassName="overflow-x-auto">
          <div className="px-4 py-3 border-b border-[#F5EEE3]">
            <Chips
              current={kindFilter ?? "todos"}
              items={[
                { key: "todos", label: "Todos", href: base({ tipo: null }) },
                { key: "receita", label: "Receitas", href: base({ tipo: "receita" }) },
                { key: "despesa", label: "Despesas", href: base({ tipo: "despesa" }) },
              ]}
            />
          </div>
          {listed.length === 0 ? <EmptyState icon={Wallet}>Nenhum lançamento neste mês.</EmptyState> : (
            <table className="p-table">
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Cliente</th><th>Forma</th><th>Situação</th><th className="text-right">Valor</th><th className="text-right">Taxa</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {listed.map((t) => (
                  <tr key={t.id}>
                    <td className="p-num whitespace-nowrap">{fmtDate(t.occurred_on, { year: undefined })}</td>
                    <td>{t.description ?? "—"}</td>
                    <td className="text-[#6B5A4B]">{t.category}</td>
                    <td>{t.clients ? <Link href={`/painel/clientes/${t.clients.id}`} className="hover:underline">{t.clients.name}</Link> : "—"}</td>
                    <td>{METHOD_LABEL[t.method]}</td>
                    <td>{t.status === "pago" ? <Badge tone="green">pago</Badge> : <Badge tone="gold">pendente</Badge>}</td>
                    <td className={`text-right p-num whitespace-nowrap font-bold ${t.kind === "despesa" ? "text-[#9B2C2C]" : "text-[#1F6B3A]"}`}>{t.kind === "despesa" ? "− " : "+ "}{brl(t.amount)}</td>
                    <td className="text-right p-num text-xs text-[#857566]">{Number(t.fee) ? brl(t.fee) : ""}</td>
                    <td className="text-right">
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmButton confirmText="Excluir"><Trash2 size={12} /></ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === "contas" && (
        <div className="grid xl:grid-cols-2 gap-5">
          {([["A receber", toReceive, "receita"], ["A pagar", toPay, "despesa"]] as const).map(([title, items, kind]) => (
            <Card key={kind} title={title} eyebrow={`${items.length} em aberto · ${brl(sum(items as Tx[]))}`} gold={kind === "despesa"} bodyClassName="p-3">
              {items.length === 0 ? <EmptyState>Nada em aberto.</EmptyState> : (
                <ul className="flex flex-col gap-2">
                  {(items as Tx[]).map((t) => {
                    const overdue = t.due_on! < today;
                    return (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: overdue ? "#F2C1C1" : "#F0E8DB", background: overdue ? "#FFF6F6" : "#fff" }}>
                        <div className="text-center w-12 shrink-0">
                          <p className="p-display text-2xl leading-none">{t.due_on!.slice(8)}</p>
                          <p className="text-[10px] uppercase text-[#857566]">{monthName(t.due_on!.slice(0, 7), "short").slice(0, 3)}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{t.description ?? t.category}</p>
                          <p className="text-xs text-[#857566] truncate">{t.clients?.name ?? t.category} {overdue && <strong className="text-[#9B2C2C]">· vencida</strong>}</p>
                        </div>
                        <p className="p-num font-bold whitespace-nowrap">{brl(t.amount)}</p>
                        <form action={markTransactionPaid}>
                          <input type="hidden" name="id" value={t.id} />
                          <SubmitButton className="p-btn-ghost p-btn-sm" title={kind === "receita" ? "Marcar como recebido" : "Marcar como pago"}><Check size={13} /> {kind === "receita" ? "Recebido" : "Pago"}</SubmitButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

      {newKind && (
        <Drawer title={newKind === "receita" ? "Nova receita" : "Nova despesa"} eyebrow="Lançamento" closeHref={base({})}>
          <ActionForm action={createTransaction} resetOnSuccess className="flex flex-col gap-3">
            <input type="hidden" name="kind" value={newKind} />
            <div className="grid grid-cols-2 gap-3">
              <label><span className="p-label">Valor total (R$)</span><input name="amount" required inputMode="decimal" placeholder="0,00" className="p-input p-num" /></label>
              <label><span className="p-label">Data / vencimento</span><input name="occurred_on" type="date" required defaultValue={ym === today.slice(0, 7) ? today : first} className="p-input" /></label>
              <label>
                <span className="p-label">Categoria</span>
                <select name="category" className="p-input">{CATEGORIES[newKind].map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label>
                <span className="p-label">Forma</span>
                <select name="method" defaultValue="pix" className="p-input">{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label>
                <span className="p-label">Situação</span>
                <select name="status" defaultValue="pago" className="p-input">
                  <option value="pago">{newKind === "receita" ? "Recebido" : "Pago"}</option>
                  <option value="pendente">{newKind === "receita" ? "A receber" : "A pagar"}</option>
                </select>
              </label>
              <label><span className="p-label">Parcelas / recorrência</span><input name="installments" type="number" min={1} max={24} defaultValue={1} className="p-input p-num" /></label>
            </div>
            {newKind === "receita" && (
              <label>
                <span className="p-label">Cliente (opcional)</span>
                <select name="client_id" defaultValue="" className="p-input">
                  <option value="">—</option>
                  {(clientsRes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            <label><span className="p-label">Descrição</span><input name="description" className="p-input" placeholder={newKind === "despesa" ? "Ex.: Aluguel de outubro" : "Opcional"} /></label>
            <p className="text-[11px] text-[#857566]">
              Com mais de 1 parcela, o valor é dividido em lançamentos mensais (as seguintes ficam pendentes). Taxas de cartão: crédito {settings.fee_credit}% · débito {settings.fee_debit}%.
            </p>
            <div><SubmitButton>Lançar</SubmitButton></div>
          </ActionForm>
        </Drawer>
      )}
    </>
  );
}
