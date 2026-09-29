import { useQuery } from "@powersync/react-native";
import { addDays, brl, dateSP, fmtDate, fmtTime, lastDayOfMonth, nowMs, shiftMonth, SOURCE_LABEL, todaySP, weekday } from "@shared/format";
import { toMinutes, toTimestamp } from "@shared/hours";
import type { ClientSource } from "@shared/types";
import { useMemo, useState } from "react";
import { BarChart3, CalendarCheck, Percent, UserCheck, UserX } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { BarList, Split } from "@/components/charts";
import { Avatar, Card, Empty, Row, Screen, Segmented, Stat, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { useServices, useSettings } from "@/db/hooks";
import { ts } from "@/lib/agenda";
import { useClients } from "@/lib/reports";

const PERIODS = { mes: "Este mês", anterior: "Mês passado", trimestre: "Últimos 3 meses", ano: "Últimos 12 meses" } as const;
const WEEK = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HEAT = ["#FAF5EC", "#F1E4CB", "#E8D3A6", "#D2AE66", "#9A6F1E", "#7A5410", "#553A0B"];
const wd = (iso: string) => (weekday(dateSP(iso)) + 6) % 7;

type Appt = { client_id: string; service_id: string; starts_at: string; ends_at: string; status: string; price: number; source: string };

/** Relatórios do período: ocupação, faltas, cancelamentos, faturamento, mapa de demanda e origem das clientes. */
export default function Relatorios() {
  const wide = useWide();
  const settings = useSettings();
  const services = useServices();
  const clients = useClients();
  const [period, setPeriod] = useState<keyof typeof PERIODS>("mes");
  const today = todaySP();
  const ym = today.slice(0, 7);
  const [from, to] = period === "anterior" ? [`${shiftMonth(ym, -1)}-01`, lastDayOfMonth(shiftMonth(ym, -1))]
    : period === "trimestre" ? [`${shiftMonth(ym, -2)}-01`, today] : period === "ano" ? [`${shiftMonth(ym, -11)}-01`, today] : [`${ym}-01`, today];
  const { data: appts } = useQuery<Appt>(
    `select client_id, service_id, ${ts("starts_at")} as starts_at, ${ts("ends_at")} as ends_at, status, price, source from appointments where julianday(starts_at) >= julianday(?) and julianday(starts_at) < julianday(?)`,
    [toTimestamp(from, "00:00"), toTimestamp(addDays(to, 1), "00:00")],
  );
  const { data: top } = useQuery<{ client_id: string; v: number }>(
    "select client_id, sum(amount) as v from transactions where status = 'pago' and kind = 'receita' and client_id is not null and occurred_on between ? and ? group by client_id order by v desc limit 8",
    [from, to],
  );

  const r = useMemo(() => {
    const done = appts.filter((a) => a.status === "concluido");
    const active = appts.filter((a) => a.status !== "cancelado");
    const noShow = appts.filter((a) => a.status === "faltou").length;
    const cancelled = appts.length - active.length;
    const past = active.filter((a) => Date.parse(a.starts_at) < nowMs()).length;
    let openMin = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      const h = settings.business_hours[String(weekday(d)) as "0"];
      if (h) openMin += toMinutes(h.close) - toMinutes(h.open) - (h.break_start && h.break_end ? toMinutes(h.break_end) - toMinutes(h.break_start) : 0);
    }
    const busyMin = active.reduce((s, a) => s + (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000, 0);
    const heat = new Map<string, number>();
    for (const a of active) { const k = `${wd(a.starts_at)}-${Number(fmtTime(a.starts_at).slice(0, 2))}`; heat.set(k, (heat.get(k) ?? 0) + 1); }
    const hrs = [...heat.keys()].map((k) => Number(k.split("-")[1]));
    const hours = hrs.length ? Array.from({ length: Math.max(...hrs) - Math.min(...hrs) + 1 }, (_, i) => Math.min(...hrs) + i) : [];
    const byService = new Map<string, { count: number; revenue: number }>();
    for (const a of done) { const c = byService.get(a.service_id) ?? { count: 0, revenue: 0 }; byService.set(a.service_id, { count: c.count + 1, revenue: c.revenue + Number(a.price) }); }
    const name = new Map(services.map((s) => [s.id, s.name]));
    const attended = new Set(done.map((a) => a.client_id));
    const newClients = clients.filter((c) => attended.has(c.id) && c.first_visit && dateSP(c.first_visit) >= from).length;
    const sources = new Map<string, { total: number; converted: number }>();
    for (const c of clients.filter((x) => dateSP(x.created_at) >= from && dateSP(x.created_at) <= to)) {
      const s = sources.get(c.source) ?? { total: 0, converted: 0 };
      sources.set(c.source, { total: s.total + 1, converted: s.converted + (attended.has(c.id) || c.first_visit ? 1 : 0) });
    }
    return {
      done, noShow, cancelled, attended: attended.size, newClients, heat, hours, openMin, busyMin,
      noShowRate: past ? Math.round((noShow / past) * 100) : 0, cancelRate: appts.length ? Math.round((cancelled / appts.length) * 100) : 0,
      siteShare: appts.length ? Math.round((appts.filter((a) => a.source === "site").length / appts.length) * 100) : 0,
      heatMax: Math.max(...heat.values(), 1),
      ranking: [...byService].map(([id, v]) => ({ label: name.get(id) ?? id, value: v.count, hint: brl(v.revenue) })).sort((a, b) => b.value - a.value),
      sources: [...sources].map(([k, v]) => ({ label: SOURCE_LABEL[k as ClientSource], value: v.total, hint: `${v.converted} atendidas` })).sort((a, b) => b.value - a.value),
      byWeekday: WEEK.map((label, i) => ({ label, value: done.filter((a) => wd(a.starts_at) === i).reduce((s, a) => s + Number(a.price), 0) })).filter((x) => x.value > 0),
    };
  }, [appts, services, clients, settings.business_hours, from, to]);
  const nameById = new Map(clients.map((c) => [c.id, c.name]));

  const cell = { width: 44, textAlign: "center" as const, fontFamily: Font.body, fontSize: 11, color: Brand.muted };
  const attendedPct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <Screen
      eyebrow="Gestão" title="Relatórios" subtitle={`${fmtDate(from)} a ${fmtDate(to)}`} back
      right={<Segmented value={period} options={(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((k) => ({ value: k, label: PERIODS[k] }))} onChange={setPeriod} />}
    >
      <Row wrap gap={12}>
        <Stat dark icon={Percent} label="Ocupação da agenda" value={`${attendedPct(r.busyMin, r.openMin)}%`} hint={`${Math.round(r.busyMin / 60)}h de ${Math.round(r.openMin / 60)}h`} />
        <Stat icon={CalendarCheck} label="Atendimentos" value={String(r.done.length)} hint={`${appts.length} agendados · ${r.siteShare}% pelo site`} />
        <Stat icon={UserX} label="Taxa de faltas" value={`${r.noShowRate}%`} tone={r.noShowRate > 10 ? "red" : "bronze"} hint={`${r.noShow} faltas`} />
        <Stat label="Cancelamentos" value={`${r.cancelRate}%`} hint={`${r.cancelled} cancelados`} />
        <Stat icon={UserCheck} label="Clientes atendidas" value={String(r.attended)} hint={`${r.newClients} novas · ${r.attended - r.newClients} recorrentes`} />
      </Row>
      <Split
        ratio={2}
        left={
          <Card title="Mapa de demanda" eyebrow="Dia da semana × horário" bodyStyle={{ padding: 20, gap: 12 }}>
            {r.hours.length === 0 ? <Empty icon={BarChart3} text="Sem atendimentos no período." /> : (
              <ScrollView horizontal>
                <View style={{ gap: 4 }}>
                  <Row gap={4}><View style={{ width: 44 }} />{r.hours.map((h) => <Text key={h} style={cell}>{h}h</Text>)}</Row>
                  {WEEK.map((w, wi) => (
                    <Row key={w} gap={4}>
                      <Text style={[cell, { fontFamily: Font.bold, textAlign: "right", paddingRight: 8, color: Brand.body }]}>{w}</Text>
                      {r.hours.map((h) => {
                        const v = r.heat.get(`${wi}-${h}`) ?? 0;
                        const i = v ? Math.min(HEAT.length - 1, Math.ceil((v / r.heatMax) * (HEAT.length - 1))) : 0;
                        return <View key={h} style={{ width: 44, height: 32, borderRadius: 6, backgroundColor: HEAT[i], alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: Font.body, fontSize: 11, color: i >= 4 ? "#fff" : Brand.muted }}>{v || ""}</Text></View>;
                      })}
                    </Row>
                  ))}
                </View>
              </ScrollView>
            )}
            <Row gap={4}><Text style={cell}>Menos</Text>{HEAT.map((c) => <View key={c} style={{ width: 16, height: 10, borderRadius: 2, backgroundColor: c }} />)}<Text style={cell}>Mais</Text></Row>
          </Card>
        }
        right={<Card title="Serviços mais realizados" eyebrow="Quantidade · faturamento"><BarList rows={r.ranking} format={(n) => `${n}×`} /></Card>}
      />
      <View style={{ flexDirection: wide ? "row" : "column", gap: 20, alignItems: "flex-start" }}>
        <Card style={{ flex: wide ? 1 : undefined, alignSelf: "stretch" }} title="Origem dos novos clientes" eyebrow="Marketing"><BarList rows={r.sources} format={String} color={Brand.gold} /></Card>
        <Card style={{ flex: wide ? 1 : undefined, alignSelf: "stretch" }} title="Faturamento por dia da semana"><BarList rows={r.byWeekday} format={brl} /></Card>
        <Card style={{ flex: wide ? 1 : undefined, alignSelf: "stretch" }} title="Clientes que mais investiram" bodyStyle={{ padding: 12 }}>
          {top.length === 0 ? <Text style={{ fontFamily: Font.body, fontSize: 14, color: Brand.muted, textAlign: "center", padding: 24 }}>Sem pagamentos no período.</Text> : top.map((t, i) => (
            <Row key={t.client_id} gap={12} style={{ paddingVertical: 8 }}>
              <Text style={{ width: 16, fontFamily: Font.body, fontSize: 12, color: "#A69885" }}>{i + 1}</Text>
              <Avatar name={nameById.get(t.client_id) ?? "?"} size={32} />
              <Text style={{ flex: 1, fontFamily: Font.body, fontSize: 14, color: Brand.ink }} numberOfLines={1}>{nameById.get(t.client_id)}</Text>
              <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Brand.ink }}>{brl(t.v)}</Text>
            </Row>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
