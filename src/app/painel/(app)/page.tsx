import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Boxes, CalendarCheck, CalendarPlus, Cake, CircleDollarSign, Clock, MessageCircle, Package,
  Receipt, Repeat, Sparkles, UserPlus, Users,
} from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { activePackages, APPT_SELECT, appointmentsBetween, clientsWithStats } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import {
  addDays, brl, diffDays, fillTemplate, firstName, fmtDate, fmtWeekday, INTERACTION_LABEL, monthName, shiftMonth, todaySP, whatsappLink,
} from "@/lib/format";
import { RECURRENCE_META } from "@/lib/recurrence";
import AppointmentItem from "@/components/painel/AppointmentItem";
import SubmitButton from "@/components/painel/SubmitButton";
import { MonthlyChart } from "@/components/painel/charts";
import { Avatar, Badge, Card, EmptyState, PageHeader, StatTile } from "@/components/painel/ui";
import { completeInteraction } from "../actions";
import type { AppointmentWithRefs, InteractionRow, Product } from "@/lib/types";

export const metadata = { title: "Início" };

type FollowUp = InteractionRow & { clients: { id: string; name: string; phone: string | null } | null };
type Bill = { id: string; kind: string; amount: number; description: string | null; category: string; due_on: string };

export default async function DashboardPage() {
  const { supabase, staff } = await requireStaff();
  const today = todaySP();
  const ym = today.slice(0, 7);

  const [todayAppts, pendingRes, txRes, followRes, newClientsRes, clients, productsRes, billsRes, packages, settings, monthApptsRes] = await Promise.all([
    appointmentsBetween(supabase, today, today),
    supabase.from("appointments").select(APPT_SELECT).eq("status", "solicitado").gte("starts_at", new Date().toISOString()).order("starts_at").limit(8),
    supabase.from("transactions").select("kind, amount, fee, occurred_on").eq("status", "pago").gte("occurred_on", `${shiftMonth(ym, -6)}-01`).lte("occurred_on", today),
    supabase.from("interactions").select("*, clients(id, name, phone)").is("done_at", null).not("due_on", "is", null).lte("due_on", today).order("due_on").limit(6),
    supabase.from("clients").select("id", { count: "exact", head: true }).gte("created_at", `${ym}-01T00:00:00-03:00`),
    clientsWithStats(supabase, today),
    supabase.from("products").select("*").eq("active", true),
    supabase.from("transactions").select("id, kind, amount, description, category, due_on").eq("status", "pendente").lte("due_on", addDays(today, 7)).order("due_on").limit(8),
    activePackages(supabase),
    getSettings(supabase),
    supabase.from("appointments").select("status, price").eq("status", "concluido").gte("starts_at", `${ym}-01T00:00:00-03:00`),
  ]);

  const pending = (pendingRes.data ?? []) as AppointmentWithRefs[];
  const followUps = (followRes.data ?? []) as FollowUp[];
  const txs = txRes.data ?? [];
  const sumMonth = (m: string, kind: string) =>
    txs.filter((t) => t.kind === kind && t.occurred_on.startsWith(m)).reduce((s, t) => s + Number(t.amount) - (kind === "receita" ? Number(t.fee) : 0), 0);
  const incomeMonth = sumMonth(ym, "receita");
  const lastMonthSamePeriod = txs
    .filter((t) => t.kind === "receita" && t.occurred_on.startsWith(shiftMonth(ym, -1)) && Number(t.occurred_on.slice(8)) <= Number(today.slice(8)))
    .reduce((s, t) => s + Number(t.amount) - Number(t.fee), 0);
  const trend = lastMonthSamePeriod ? Math.round(((incomeMonth - lastMonthSamePeriod) / lastMonthSamePeriod) * 100) : null;
  const months = Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(ym, i - 5);
    return { label: monthName(m, "short"), income: sumMonth(m, "receita"), expense: sumMonth(m, "despesa") };
  });
  const doneMonth = monthApptsRes.data ?? [];
  const ticket = doneMonth.length ? doneMonth.reduce((s, a) => s + Number(a.price), 0) / doneMonth.length : 0;

  const activeToday = todayAppts.filter((a) => a.status !== "cancelado");
  const products = (productsRes.data ?? []) as Product[];
  const lowStock = products.filter((p) => Number(p.min_qty) > 0 && Number(p.stock_qty) <= Number(p.min_qty));
  const bills = (billsRes.data ?? []) as Bill[];
  const pkgAlerts = packages.filter(
    (p) => (p.expires_on && diffDays(today, p.expires_on) <= 15) || Number(p.sessions_remaining) <= 1,
  );
  const birthdaysToday = clients.filter((c) => c.birth_date?.slice(5) === today.slice(5));
  const returns = clients
    .filter((c) => c.recurrence.status === "atrasada" || c.recurrence.status === "proxima")
    .sort((a, b) => (a.recurrence.daysUntilDue ?? 0) - (b.recurrence.daysUntilDue ?? 0))
    .slice(0, 6);
  const alertsCount = lowStock.length + bills.length + pkgAlerts.length + birthdaysToday.length;

  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      <PageHeader
        eyebrow={`${fmtWeekday(today, "long")} · ${fmtDate(today, { month: "long", year: undefined })}`}
        title={<>{greeting}, <em className="italic text-[#82590F]">{firstName(staff.name)}</em></>}
        subtitle={
          activeToday.length
            ? `Você tem ${activeToday.length} atendimento${activeToday.length > 1 ? "s" : ""} hoje${pending.length ? ` e ${pending.length} pedido${pending.length > 1 ? "s" : ""} para confirmar` : ""}.`
            : "Nenhum atendimento hoje — bom momento para chamar clientes de volta."
        }
        actions={
          <>
            <Link href="/painel/clientes?nova=1" className="p-btn-ghost"><UserPlus size={14} /> Nova cliente</Link>
            <Link href="/painel/agenda?novo=1" className="p-btn"><CalendarPlus size={14} /> Agendar</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 lg:col-span-1">
          <StatTile tone="dark" label={`Faturamento · ${monthName(ym, "short")}`} value={brl(incomeMonth)} trend={trend} hint="líquido, vs. mês passado" icon={CircleDollarSign} href="/painel/financeiro" />
        </div>
        <StatTile label="Hoje" value={activeToday.length} hint={`${activeToday.filter((a) => a.status === "concluido").length} concluídos`} icon={CalendarCheck} href="/painel/agenda?view=dia" />
        <StatTile label="A confirmar" value={pending.length} tone={pending.length ? "warn" : "default"} hint="pedidos do site" icon={Clock} href="/painel/agenda" />
        <StatTile label="Ticket médio" value={brl(ticket)} hint={`${doneMonth.length} atendimentos no mês`} icon={Receipt} href="/painel/relatorios" />
        <StatTile label="Novos clientes" value={newClientsRes.count ?? 0} hint="neste mês" icon={Users} href="/painel/crm" />
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2 flex flex-col gap-5">
          {pending.length > 0 && (
            <Card title="Pedidos do site" eyebrow="Confirme pelo WhatsApp" gold action={<Badge tone="gold">{pending.length}</Badge>} bodyClassName="p-3">
              <div className="flex flex-col gap-2">{pending.map((a) => <AppointmentItem key={a.id} appt={a} showDate />)}</div>
            </Card>
          )}
          <Card
            title="Agenda de hoje"
            eyebrow={fmtDate(today, { year: undefined })}
            action={<Link href="/painel/agenda?view=dia" className="text-xs text-[#82590F] hover:underline flex items-center gap-1">Abrir agenda <ArrowRight size={12} /></Link>}
            bodyClassName="p-3"
          >
            {todayAppts.length === 0 ? (
              <EmptyState icon={Sparkles}>Agenda livre hoje.</EmptyState>
            ) : (
              <div className="flex flex-col gap-2">{todayAppts.map((a) => <AppointmentItem key={a.id} appt={a} />)}</div>
            )}
          </Card>
          <Card title="Receitas e despesas" eyebrow="Últimos 6 meses" action={<Link href="/painel/financeiro" className="text-xs text-[#82590F] hover:underline">Financeiro</Link>}>
            <MonthlyChart months={months} />
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card title="Atenção" eyebrow="Alertas da clínica" action={alertsCount ? <Badge tone="red">{alertsCount}</Badge> : undefined} bodyClassName="p-3">
            {alertsCount === 0 ? (
              <EmptyState icon={Sparkles}>Nada pedindo atenção agora.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2">
                {birthdaysToday.map((c) => {
                  const wa = whatsappLink(c.phone, fillTemplate(settings.templates.aniversario, { nome: firstName(c.name), clinica: settings.clinic_name }));
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-[#F6EEF8]">
                      <Cake size={16} className="text-[#6B2E7A]" />
                      <Link href={`/painel/clientes/${c.id}`} className="flex-1 text-sm hover:underline">Aniversário de <strong>{c.name}</strong></Link>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm" aria-label="Parabenizar"><MessageCircle size={13} /></a>}
                    </li>
                  );
                })}
                {bills.map((b) => (
                  <li key={b.id}>
                    <Link href="/painel/financeiro?tab=contas" className="flex items-center gap-3 rounded-xl px-3 py-2 bg-[#FFF6DD] hover:brightness-95">
                      <Receipt size={16} className="text-[#7A5510]" />
                      <span className="flex-1 text-sm">
                        {b.kind === "despesa" ? "Pagar" : "Receber"} <strong>{brl(b.amount)}</strong> · {b.description ?? b.category}
                      </span>
                      <span className={`text-xs ${b.due_on < today ? "text-[#9B2C2C] font-bold" : "text-[#7A5510]"}`}>
                        {b.due_on < today ? "vencida" : b.due_on === today ? "hoje" : fmtDate(b.due_on, { year: undefined })}
                      </span>
                    </Link>
                  </li>
                ))}
                {lowStock.map((p) => (
                  <li key={p.id}>
                    <Link href="/painel/estoque" className="flex items-center gap-3 rounded-xl px-3 py-2 bg-[#FDECEC] hover:brightness-95">
                      <Boxes size={16} className="text-[#9B2C2C]" />
                      <span className="flex-1 text-sm">Estoque baixo: <strong>{p.name}</strong></span>
                      <span className="text-xs text-[#9B2C2C] p-num">{Number(p.stock_qty)} {p.unit}</span>
                    </Link>
                  </li>
                ))}
                {pkgAlerts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/painel/clientes/${p.client_id}?tab=pacotes`} className="flex items-center gap-3 rounded-xl px-3 py-2 bg-[#EEF1FB] hover:brightness-95">
                      <Package size={16} className="text-[#34459A]" />
                      <span className="flex-1 text-sm">
                        {p.name}: {Number(p.sessions_remaining) <= 1 ? `resta ${p.sessions_remaining} sessão` : `vence ${fmtDate(p.expires_on, { year: undefined })}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Tarefas de hoje" eyebrow="CRM" action={<Link href="/painel/crm" className="text-xs text-[#82590F] hover:underline">Ver todas</Link>} bodyClassName="p-3">
            {followUps.length === 0 ? (
              <EmptyState icon={AlertTriangle}>Nenhuma tarefa pendente.</EmptyState>
            ) : (
              <ul className="flex flex-col divide-y divide-[#F5EEE3]">
                {followUps.map((f) => (
                  <li key={f.id} className="py-2.5 px-1 flex gap-3 items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <Link href={`/painel/clientes/${f.clients?.id}?tab=relacionamento`} className="text-[#2B221B] hover:underline">{f.clients?.name}</Link>
                        {f.due_on! < today && <span className="ml-2"><Badge tone="red">Atrasada</Badge></span>}
                      </p>
                      <p className="text-xs text-[#857566] line-clamp-2"><strong>{INTERACTION_LABEL[f.kind]}:</strong> {f.content}</p>
                    </div>
                    <form action={completeInteraction}>
                      <input type="hidden" name="id" value={f.id} />
                      <SubmitButton className="p-btn-ghost p-btn-sm">Feito</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Chamar de volta" eyebrow="Recorrência" action={<Link href="/painel/recorrencia" className="text-xs text-[#82590F] hover:underline flex items-center gap-1"><Repeat size={12} /> Ver</Link>} bodyClassName="p-3">
            {returns.length === 0 ? (
              <EmptyState icon={Repeat}>Nenhum retorno pendente.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-1">
                {returns.map((c) => {
                  const wa = whatsappLink(c.phone, fillTemplate(settings.templates.retorno, { nome: firstName(c.name), servico: "tratamento", clinica: settings.clinic_name }));
                  return (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#FDFAF5]">
                      <Avatar name={c.name} size={30} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/painel/clientes/${c.id}`} className="text-sm text-[#2B221B] hover:underline truncate block">{c.name}</Link>
                        <p className="text-[11px] text-[#857566]">{RECURRENCE_META[c.recurrence.status].label} · {c.recurrence.daysSinceLast} dias</p>
                      </div>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm" aria-label={`WhatsApp de ${c.name}`}><MessageCircle size={13} /></a>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
