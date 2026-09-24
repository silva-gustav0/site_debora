import Link from "next/link";
import { BarChart3, CalendarCheck, Percent, UserCheck, UserX } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { appointmentsBetween, listServices } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { addDays, brl, dateSP, fmtDate, fmtTime, lastDayOfMonth, nowMs, shiftMonth, SOURCE_LABEL, todaySP, weekday } from "@/lib/format";
import { toMinutes } from "@/lib/hours";
import { BarList } from "@/components/painel/charts";
import { Avatar, Card, Chips, EmptyState, PageHeader, StatTile } from "@/components/painel/ui";
import type { ClientSource } from "@/lib/types";

export const metadata = { title: "Relatórios" };

const PERIODS = { mes: "Este mês", anterior: "Mês passado", trimestre: "Últimos 3 meses", ano: "Últimos 12 meses" } as const;
const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HEAT = ["#FAF5EC", "#F1E4CB", "#E8D3A6", "#D2AE66", "#9A6F1E", "#7A5410", "#553A0B"];

export default async function ReportsPage({ searchParams }: PageProps<"/painel/relatorios">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const ym = today.slice(0, 7);
  const period = (typeof sp.p === "string" && sp.p in PERIODS ? sp.p : "mes") as keyof typeof PERIODS;
  const [from, to] =
    period === "anterior" ? [`${shiftMonth(ym, -1)}-01`, lastDayOfMonth(shiftMonth(ym, -1))]
    : period === "trimestre" ? [`${shiftMonth(ym, -2)}-01`, today]
    : period === "ano" ? [`${shiftMonth(ym, -11)}-01`, today]
    : [`${ym}-01`, today];

  const [appts, services, settings, clientsRes, statsRes, txRes] = await Promise.all([
    appointmentsBetween(supabase, from, to),
    listServices(supabase),
    getSettings(supabase),
    supabase.from("clients").select("id, name, source, created_at"),
    supabase.from("client_stats").select("client_id, first_visit"),
    supabase.from("transactions").select("client_id, amount, kind").eq("status", "pago").eq("kind", "receita").gte("occurred_on", from).lte("occurred_on", to),
  ]);

  const done = appts.filter((a) => a.status === "concluido");
  const noShow = appts.filter((a) => a.status === "faltou");
  const cancelled = appts.filter((a) => a.status === "cancelado");
  const past = appts.filter((a) => Date.parse(a.starts_at) < nowMs() && a.status !== "cancelado");
  const noShowRate = past.length ? Math.round((noShow.length / past.length) * 100) : 0;
  const cancelRate = appts.length ? Math.round((cancelled.length / appts.length) * 100) : 0;
  const siteShare = appts.length ? Math.round((appts.filter((a) => a.source === "site").length / appts.length) * 100) : 0;

  // Ocupação: minutos ocupados / minutos de funcionamento no período (até hoje).
  let openMin = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const h = settings.business_hours[String(weekday(d)) as "0"];
    if (!h) continue;
    openMin += toMinutes(h.close) - toMinutes(h.open) - (h.break_start && h.break_end ? toMinutes(h.break_end) - toMinutes(h.break_start) : 0);
  }
  const busyMin = appts.filter((a) => a.status !== "cancelado").reduce((s, a) => s + (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000, 0);
  const occupancy = openMin ? Math.round((busyMin / openMin) * 100) : 0;

  // Mapa de demanda: dia da semana x hora.
  const heat = new Map<string, number>();
  let heatMax = 0;
  const hoursSet = new Set<number>();
  for (const a of appts.filter((x) => x.status !== "cancelado")) {
    const wd = (weekday(dateSP(a.starts_at)) + 6) % 7;
    const hr = Number(fmtTime(a.starts_at).slice(0, 2));
    hoursSet.add(hr);
    const k = `${wd}-${hr}`;
    heat.set(k, (heat.get(k) ?? 0) + 1);
    heatMax = Math.max(heatMax, heat.get(k)!);
  }
  const hours = hoursSet.size ? Array.from({ length: Math.max(...hoursSet) - Math.min(...hoursSet) + 1 }, (_, i) => Math.min(...hoursSet) + i) : [];

  const svcName = new Map(services.map((s) => [s.id, s.name]));
  const byService = new Map<string, { count: number; revenue: number }>();
  for (const a of done) {
    const cur = byService.get(a.service_id) ?? { count: 0, revenue: 0 };
    byService.set(a.service_id, { count: cur.count + 1, revenue: cur.revenue + Number(a.price) });
  }
  const servicesRank = [...byService.entries()].map(([id, v]) => ({ label: svcName.get(id) ?? id, value: v.count, hint: brl(v.revenue) })).sort((a, b) => b.value - a.value);

  const firstVisit = new Map((statsRes.data ?? []).map((s) => [s.client_id, s.first_visit as string | null]));
  const attended = new Set(done.map((a) => a.client_id));
  const newClients = [...attended].filter((id) => {
    const f = firstVisit.get(id);
    return f && dateSP(f) >= from;
  }).length;
  const returning = attended.size - newClients;

  const clients = clientsRes.data ?? [];
  const createdInPeriod = clients.filter((c) => dateSP(c.created_at) >= from && dateSP(c.created_at) <= to);
  const sources = new Map<string, { total: number; converted: number }>();
  for (const c of createdInPeriod) {
    const cur = sources.get(c.source) ?? { total: 0, converted: 0 };
    sources.set(c.source, { total: cur.total + 1, converted: cur.converted + (attended.has(c.id) || firstVisit.get(c.id) ? 1 : 0) });
  }
  const sourceRows = [...sources.entries()].map(([k, v]) => ({ label: SOURCE_LABEL[k as ClientSource], value: v.total, hint: `${v.converted} atendidas` })).sort((a, b) => b.value - a.value);

  const spend = new Map<string, number>();
  for (const t of txRes.data ?? []) if (t.client_id) spend.set(t.client_id, (spend.get(t.client_id) ?? 0) + Number(t.amount));
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const topClients = [...spend.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const byWeekday = WEEK.map((w, i) => ({
    label: w,
    value: done.filter((a) => (weekday(dateSP(a.starts_at)) + 6) % 7 === i).reduce((s, a) => s + Number(a.price), 0),
  })).filter((r) => r.value > 0);

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Relatórios"
        subtitle={`${fmtDate(from)} a ${fmtDate(to)}`}
        actions={<Chips current={period} items={Object.entries(PERIODS).map(([k, l]) => ({ key: k, label: l, href: `/painel/relatorios?p=${k}` }))} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="col-span-2 lg:col-span-1"><StatTile tone="dark" label="Ocupação da agenda" value={`${occupancy}%`} hint={`${Math.round(busyMin / 60)}h de ${Math.round(openMin / 60)}h`} icon={Percent} /></div>
        <StatTile label="Atendimentos" value={done.length} hint={`${appts.length} agendados · ${siteShare}% pelo site`} icon={CalendarCheck} />
        <StatTile label="Taxa de faltas" value={`${noShowRate}%`} tone={noShowRate > 10 ? "warn" : "default"} hint={`${noShow.length} faltas`} icon={UserX} />
        <StatTile label="Cancelamentos" value={`${cancelRate}%`} hint={`${cancelled.length} cancelados`} />
        <StatTile label="Clientes atendidos" value={attended.size} hint={`${newClients} novos · ${returning} recorrentes`} icon={UserCheck} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mb-5">
        <Card title="Mapa de demanda" eyebrow="Dia da semana × horário" className="xl:col-span-2" bodyClassName="p-5 overflow-x-auto">
          {hours.length === 0 ? <EmptyState icon={BarChart3}>Sem atendimentos no período.</EmptyState> : (
            <figure>
              <table className="border-separate" style={{ borderSpacing: 4 }}>
                <thead>
                  <tr>
                    <th />
                    {hours.map((h) => <th key={h} className="text-[10.5px] font-normal text-[#857566] p-num w-11">{h}h</th>)}
                  </tr>
                </thead>
                <tbody>
                  {WEEK.map((w, wi) => (
                    <tr key={w}>
                      <th className="text-[11px] font-bold text-[#6B5A4B] pr-2 text-right">{w}</th>
                      {hours.map((h) => {
                        const v = heat.get(`${wi}-${h}`) ?? 0;
                        const idx = v === 0 ? 0 : Math.min(HEAT.length - 1, Math.ceil((v / heatMax) * (HEAT.length - 1)));
                        return (
                          <td
                            key={h}
                            title={`${w} ${h}h: ${v} atendimento${v === 1 ? "" : "s"}`}
                            className="h-9 w-11 rounded-md text-center text-[11px] p-num"
                            style={{ background: HEAT[idx], color: idx >= 4 ? "#fff" : "#6B5A4B" }}
                          >
                            {v || ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <figcaption className="flex items-center gap-2 text-[11px] text-[#857566] mt-3">
                Menos {HEAT.map((c) => <span key={c} className="w-4 h-3 rounded-sm inline-block" style={{ background: c }} />)} Mais
                <span className="ml-2">· use para decidir horários de promoção e folgas</span>
              </figcaption>
            </figure>
          )}
        </Card>
        <Card title="Serviços mais realizados" eyebrow="Quantidade · faturamento">
          <BarList rows={servicesRank} format={(n) => `${n}×`} />
        </Card>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <Card title="Origem dos novos clientes" eyebrow="Marketing">
          <BarList rows={sourceRows} format={(n) => String(n)} empty="Nenhum cliente novo no período." color="#C9973A" />
        </Card>
        <Card title="Faturamento por dia da semana">
          <BarList rows={byWeekday} />
        </Card>
        <Card title="Clientes que mais investiram" bodyClassName="p-3">
          {topClients.length === 0 ? <EmptyState>Sem pagamentos no período.</EmptyState> : (
            <ol className="flex flex-col gap-1">
              {topClients.map(([id, v], i) => (
                <li key={id}>
                  <Link href={`/painel/clientes/${id}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#FDFAF5]">
                    <span className="w-5 text-xs text-[#A69885] p-num">{i + 1}</span>
                    <Avatar name={nameById.get(id) ?? "?"} size={28} />
                    <span className="flex-1 text-sm truncate">{nameById.get(id)}</span>
                    <span className="p-num text-sm">{brl(v)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
