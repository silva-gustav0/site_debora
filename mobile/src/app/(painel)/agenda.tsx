import DateTimePicker from "@react-native-community/datetimepicker";
import {
  addDays, brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, todaySP, weekday, whatsappLink,
} from "@shared/format";
import { dayHours, freeSlots, toHHMM, toMinutes } from "@shared/hours";
import type { AppointmentStatus, BusinessHours as Hours } from "@shared/types";
import { router } from "expo-router";
import {
  BellRing, Calendar, CalendarPlus, ChevronLeft, ChevronRight, Gift, Globe, Lock, MessageCircle, Package,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  Badge, Button, Card, Chip, ConfirmButton, Empty, ListItem, Row, Screen, Section, Segmented, Sheet, Txt, useToast, useWide,
} from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { SITE_URL, useSettings } from "@/db/hooks";
import { save, write } from "@/db/write";
import { type Appt, ApptItem, between, STATUS_STYLE, ts, useAppts, useRows } from "@/lib/agenda";

type Block = { id: string; starts_at: string; ends_at: string; reason: string };

const PPM = 1.1; // pixels por minuto, como no painel
const minuteOf = (iso: string) => toMinutes(fmtTime(iso));
const LEGEND: [AppointmentStatus, string][] = [["solicitado", "A confirmar"], ["confirmado", "Confirmado"], ["concluido", "Concluído"], ["faltou", "Faltou"], ["cancelado", "Cancelado"]];

/** Agenda por dia ou semana: grade de horários no tablet (AgendaGrid do painel) e lista do dia no celular. */
export default function Agenda() {
  const toast = useToast();
  const wide = useWide();
  const landscape = useWindowDimensions().width >= 1024;
  const settings = useSettings();
  const today = todaySP();
  const tomorrow = addDays(today, 1);
  const [d, setD] = useState(today);
  const [view, setView] = useState<"dia" | "semana">(wide ? "semana" : "dia");
  const [block, setBlock] = useState<Block | null>(null);
  const [picking, setPicking] = useState(false);
  const monday = addDays(d, -((weekday(d) + 6) % 7));
  const from = view === "dia" ? d : monday;
  const to = view === "dia" ? d : addDays(monday, 6);
  const [where, ...params] = between(from, to);
  const appts = useAppts(where, params);
  const [bw, ...bp] = between(from, to, "starts_at");
  const blocks = useRows<Block>(`select id, ${ts("starts_at")} as starts_at, ${ts("ends_at")} as ends_at, reason from time_blocks where ${bw} order by datetime(starts_at)`, bp);
  const [tw, ...tp] = between(tomorrow, tomorrow);
  const reminders = useAppts(`${tw} and a.status in ('solicitado','confirmado') and a.reminder_sent_at is null`, tp);
  const days = Array.from({ length: view === "dia" ? 1 : 7 }, (_, i) => addDays(from, i))
    .filter((day) => view === "dia" || weekday(day) !== 0 || appts.some((a) => dateSP(a.starts_at) === day));
  const active = appts.filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const pending = appts.filter((a) => a.status === "solicitado");
  const shift = view === "dia" ? 1 : 7;
  const openMin = days.reduce((sum, day) => {
    const h = dayHours(day, settings.business_hours);
    return h ? sum + toMinutes(h.close) - toMinutes(h.open) - (h.break_start && h.break_end ? toMinutes(h.break_end) - toMinutes(h.break_start) : 0) : sum;
  }, 0);
  const bookedMin = active.reduce((sum, a) => sum + (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60_000, 0);
  const occupancy = openMin ? Math.round((bookedMin / openMin) * 100) : 0;
  const newAt = (params: Record<string, string>) => router.push({ pathname: "/agenda/novo", params });

  /** Lista de um dia (celular): atendimentos, bloqueios e horários livres. */
  const renderDay = (day: string) => {
    const list = appts.filter((a) => dateSP(a.starts_at) === day);
    const dayBlocks = blocks.filter((b) => dateSP(b.starts_at) === day);
    const slots = view === "dia" ? freeSlots(day, settings.slot_step_min, [...list.filter((a) => a.status !== "cancelado" && a.status !== "faltou"), ...dayBlocks], new Date(), settings.business_hours, settings.slot_step_min).filter((s) => s.available) : [];
    const items: { at: string; a?: Appt; b?: Block }[] = [...list.map((a) => ({ at: a.starts_at, a })), ...dayBlocks.map((b) => ({ at: b.starts_at, b }))].sort((x, y) => x.at.localeCompare(y.at));
    return (
      <Section key={day} title={`${fmtWeekday(day)}, ${fmtDate(day, { year: undefined })}${day === today ? " · hoje" : ""}`} right={<Badge>{String(list.filter((a) => a.status !== "cancelado").length)}</Badge>}>
        {!items.length && <Empty text="Nenhum atendimento." />}
        {items.map(({ a, b }) => (a ? <ApptItem key={a.id} a={a} /> : b && (
          <ListItem key={b.id} title={b.reason} subtitle={`Bloqueado · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`} left={<Lock size={15} color={Brand.muted} />} onPress={() => setBlock(b)} />
        )))}
        {slots.length > 0 && (
          <>
            <Txt.muted>Horários livres (toque para agendar)</Txt.muted>
            <Row wrap>{slots.map((s) => <Chip key={s.time} label={s.time} onPress={() => newAt({ date: day, time: s.time })} />)}</Row>
          </>
        )}
      </Section>
    );
  };

  const aside = (
    <View style={{ gap: 20, width: landscape ? 300 : "100%" }}>
      <Card title="A confirmar" eyebrow="Pedidos" gold bodyStyle={{ padding: 12, gap: 8 }}>
        {pending.length ? pending.map((a) => <ApptItem key={a.id} a={a} showDate />) : <Text style={s.emptyText}>Nenhum pedido pendente neste período.</Text>}
      </Card>
      <Card title="Lembretes de amanhã" eyebrow={fmtDate(tomorrow, { year: undefined })} bodyStyle={{ padding: 12, gap: 8 }}>
        {!reminders.length && <Text style={s.emptyText}>Tudo avisado. ✨</Text>}
        {reminders.map((a) => {
          const wa = whatsappLink(a.client_phone, fillTemplate(settings.templates.lembrete, {
            nome: firstName(a.client_name ?? ""), servico: a.service_name ?? "", data: fmtDate(tomorrow, { year: undefined }),
            hora: fmtTime(a.starts_at), clinica: settings.clinic_name, link: a.public_token ? `${SITE_URL}/meu-agendamento/${a.public_token}` : "",
          }));
          return (
            <Row key={a.id} style={s.reminder}>
              <View style={{ flex: 1 }}>
                <Text style={s.remName} numberOfLines={1}><Text style={{ fontFamily: Font.bold }}>{fmtTime(a.starts_at)}</Text> {a.client_name}</Text>
                <Text style={s.remSub} numberOfLines={1}>{a.service_name}</Text>
              </View>
              {wa && <Button small variant="ghost" icon={MessageCircle} onPress={() => Linking.openURL(wa)}>{""}</Button>}
              <Button small variant="ghost" icon={BellRing} onPress={() => save(toast, write((w) => w.update("appointments", a.id, { reminder_sent_at: new Date().toISOString() })))}>{""}</Button>
            </Row>
          );
        })}
      </Card>
    </View>
  );

  return (
    <Screen
      eyebrow="Agenda"
      title={view === "dia" ? `${fmtWeekday(d, "long")}, ${fmtDate(d, { month: "long", year: undefined })}` : `Semana de ${fmtDate(monday, { year: undefined })}`}
      subtitle={`${active.length} atendimentos · ${brl(active.reduce((sum, a) => sum + Number(a.price), 0))} previstos · ocupação ${occupancy}%${pending.length ? ` · ${pending.length} a confirmar` : ""}`}
      right={
        <>
          <Segmented value={view} options={[{ value: "dia", label: "Dia" }, { value: "semana", label: "Semana" }]} onChange={setView} />
          <Row gap={4}>
            <Button small variant="outline" icon={ChevronLeft} onPress={() => setD(addDays(d, -shift))}>{""}</Button>
            <Button small variant="outline" onPress={() => setD(today)}>Hoje</Button>
            <Button small variant="outline" icon={ChevronRight} onPress={() => setD(addDays(d, shift))}>{""}</Button>
          </Row>
          <Button small variant="outline" icon={Calendar} onPress={() => setPicking(true)}>{d.split("-").reverse().join("/")}</Button>
          <Button small variant="outline" icon={Lock} onPress={() => router.push({ pathname: "/agenda/bloqueio", params: { date: d } })}>Bloquear</Button>
          <Button small icon={CalendarPlus} onPress={() => newAt({ date: d < today ? today : d })}>Agendar</Button>
        </>
      }
    >
      {picking && (
        <DateTimePicker
          value={new Date(`${d}T12:00:00`)} mode="date"
          onChange={(e, date) => { setPicking(false); if (e.type === "set" && date) setD(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`); }}
        />
      )}
      {wide ? (
        <View style={{ flexDirection: landscape ? "row" : "column", gap: 20, alignItems: "flex-start" }}>
          <View style={{ flex: landscape ? 1 : undefined, width: landscape ? undefined : "100%", minWidth: 0, gap: 12 }}>
            <Grid
              days={days} appts={appts} blocks={blocks} hours={settings.business_hours} today={today} step={settings.slot_step_min}
              onDay={(day) => { setD(day); setView("dia"); }} onSlot={(date, time) => newAt({ date, time })} onBlock={setBlock}
            />
            <Row wrap gap={12}>
              {LEGEND.map(([st, label]) => (
                <Row key={st} gap={6}><View style={[s.swatch, { backgroundColor: STATUS_STYLE[st].bg, borderLeftColor: STATUS_STYLE[st].bd }]} /><Text style={s.legend}>{label}</Text></Row>
              ))}
              <Text style={s.legend}>· Toque num horário vazio para agendar</Text>
            </Row>
          </View>
          {aside}
        </View>
      ) : (
        <>
          {days.map(renderDay)}
          {aside}
        </>
      )}
      <Sheet visible={!!block} onClose={() => setBlock(null)} title={block?.reason ?? ""}>
        {block && (
          <>
            <Txt.eyebrow>Horário bloqueado</Txt.eyebrow>
            <Txt.body>{fmtDate(block.starts_at)} {fmtTime(block.starts_at)} até {fmtDate(block.ends_at)} {fmtTime(block.ends_at)}</Txt.body>
            <ConfirmButton confirmText="Remover bloqueio" onConfirm={async () => { if (await save(toast, write((w) => w.remove("time_blocks", block.id)))) setBlock(null); }}>Liberar horário</ConfirmButton>
          </>
        )}
      </Sheet>
    </Screen>
  );
}

type Placed = { a: Appt; start: number; end: number; lane: number; lanes: number };

/** Distribui atendimentos sobrepostos em colunas lado a lado (mesmo cálculo do painel). */
function layout(appts: Appt[]): Placed[] {
  const items = appts
    .map((a) => ({ a, start: minuteOf(a.starts_at), end: Math.max(minuteOf(a.ends_at), minuteOf(a.starts_at) + 15), lane: 0, lanes: 1 }))
    .sort((x, y) => x.start - y.start || y.end - x.end);
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => { const lanes = Math.max(...cluster.map((c) => c.lane)) + 1; cluster.forEach((c) => (c.lanes = lanes)); cluster = []; };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.lane));
    while (used.has(it.lane)) it.lane++;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return items;
}

/** Grade de horários com colunas por dia, intervalo sombreado, bloqueios, linha "agora" e eventos por status. */
function Grid({ days, appts, blocks, hours, today, step, onDay, onSlot, onBlock }: {
  days: string[]; appts: Appt[]; blocks: Block[]; hours: Hours; today: string; step: number;
  onDay: (d: string) => void; onSlot: (date: string, time: string) => void; onBlock: (b: Block) => void;
}) {
  const [width, setWidth] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  const nowMin = toMinutes(fmtTime(new Date(now).toISOString()));
  let start = 24 * 60, end = 0;
  for (const d of days) {
    const h = dayHours(d, hours);
    if (h) { start = Math.min(start, toMinutes(h.open)); end = Math.max(end, toMinutes(h.close)); }
  }
  for (const a of appts) { start = Math.min(start, minuteOf(a.starts_at)); end = Math.max(end, minuteOf(a.ends_at)); }
  if (start >= end) { start = 8 * 60; end = 20 * 60; }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  const height = (end - start) * PPM;
  const y = (min: number) => (min - start) * PPM;
  const hoursList = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);
  const inner = Math.max(width, days.length > 1 ? 880 : 0);

  /** Toque num espaço vazio: agenda no horário arredondado, se a clínica estiver aberta. */
  const tapSlot = (d: string, locY: number) => {
    const h = dayHours(d, hours);
    if (!h) return;
    const t = start + Math.floor((locY / PPM) / step) * step;
    const inBreak = h.break_start && h.break_end && t >= toMinutes(h.break_start) && t < toMinutes(h.break_end);
    if (t >= toMinutes(h.open) && t < toMinutes(h.close) && !inBreak) onSlot(d, toHHMM(t));
  };

  return (
    <View style={s.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 2)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: inner || undefined }}>
          <View style={[s.gridRow, s.gridHead]}>
            <View style={{ width: 56 }} />
            {days.map((d) => {
              const n = appts.filter((a) => dateSP(a.starts_at) === d && a.status !== "cancelado").length;
              const isToday = d === today;
              return (
                <Pressable key={d} onPress={() => onDay(d)} style={s.dayHead}>
                  <Text style={[s.dow, isToday && { color: Brand.bronzeMid }]}>{fmtWeekday(d).toUpperCase()}</Text>
                  <Row gap={8} style={{ alignItems: "center" }}>
                    {isToday ? (
                      <View style={s.todayDot}><Text style={[s.dayNum, { color: Brand.white, fontSize: 20 }]}>{Number(d.slice(8))}</Text></View>
                    ) : <Text style={s.dayNum}>{Number(d.slice(8))}</Text>}
                    <Text style={s.dayInfo}>{n ? `${n} atend.` : dayHours(d, hours) ? "livre" : "fechado"}</Text>
                  </Row>
                </Pressable>
              );
            })}
          </View>

          <View style={[s.gridRow, { paddingTop: 12, paddingBottom: 8 }]}>
            <View style={{ width: 56, height }}>
              {hoursList.map((m) => m < end && <Text key={m} style={[s.hourLabel, { top: y(m) - 7 }]}>{toHHMM(m)}</Text>)}
            </View>
            {days.map((d) => {
              const h = dayHours(d, hours);
              const open = h ? toMinutes(h.open) : null, close = h ? toMinutes(h.close) : null;
              const bs = h?.break_start ? toMinutes(h.break_start) : null, be = h?.break_end ? toMinutes(h.break_end) : null;
              const dayBlocks = blocks.filter((b) => dateSP(b.starts_at) <= d && dateSP(b.ends_at) >= d);
              return (
                <Pressable key={d} style={[s.col, { height }]} onPress={(e) => tapSlot(d, e.nativeEvent.locationY)}>
                  {hoursList.map((m) => <View key={m} pointerEvents="none" style={[s.hourLine, { top: y(m) }]} />)}
                  {hoursList.slice(0, -1).map((m) => <View key={`h${m}`} pointerEvents="none" style={[s.halfLine, { top: y(m + 30) }]} />)}
                  {open === null || close === null ? (
                    <View pointerEvents="none" style={[s.closed, { top: 0, height, justifyContent: "flex-start", paddingTop: 24 }]}><Text style={s.closedText}>Fechado</Text></View>
                  ) : (
                    <>
                      <View pointerEvents="none" style={[s.closed, { top: 0, height: y(open) }]} />
                      <View pointerEvents="none" style={[s.closed, { top: y(close), height: height - y(close) }]} />
                      {bs !== null && be !== null && <View pointerEvents="none" style={[s.closed, { top: y(bs), height: (be - bs) * PPM }]}><Text style={s.closedText}>Intervalo</Text></View>}
                    </>
                  )}
                  {dayBlocks.map((b) => {
                    const bStart = dateSP(b.starts_at) < d ? start : Math.max(minuteOf(b.starts_at), start);
                    const bEnd = dateSP(b.ends_at) > d ? end : Math.min(minuteOf(b.ends_at), end);
                    return bEnd > bStart && (
                      <Pressable key={b.id} onPress={() => onBlock(b)} style={[s.block, { top: y(bStart), height: (bEnd - bStart) * PPM }]}>
                        <Lock size={11} color={Brand.muted} /><Text style={s.blockText} numberOfLines={1}>{b.reason}</Text>
                      </Pressable>
                    );
                  })}
                  {layout(appts.filter((a) => dateSP(a.starts_at) === d)).map(({ a, start: st, end: en, lane, lanes }) => {
                    const c = STATUS_STYLE[a.status];
                    const hgt = Math.max((en - st) * PPM - 2, 22);
                    const strike = a.status === "cancelado" ? { textDecorationLine: "line-through" as const } : null;
                    return (
                      <View key={a.id} style={{ position: "absolute", top: y(st) + 1, height: hgt, left: `${(lane / lanes) * 100}%`, width: `${100 / lanes}%`, paddingHorizontal: 3 }}>
                        <Pressable
                          onPress={() => router.push(`/agendamento/${a.id}`)}
                          style={({ pressed }) => [s.event, { backgroundColor: c.bg, borderLeftColor: c.bd, opacity: a.status === "cancelado" || a.status === "faltou" ? 0.55 : pressed ? 0.8 : 1 }]}
                        >
                          <Row gap={3}>
                            <Text style={[s.evTime, { color: c.fg }, strike]}>{fmtTime(a.starts_at)}</Text>
                            {a.client_package_id && <Package size={10} color={c.fg} />}
                            {a.voucher_id && <Gift size={10} color={c.fg} />}
                            {a.source === "site" && <Globe size={10} color={c.fg} />}
                          </Row>
                          <Text style={[s.evText, { color: c.fg }, strike]} numberOfLines={1}>{a.client_name ?? "—"}</Text>
                          {hgt > 50 && <Text style={[s.evText, { color: c.fg, opacity: 0.75 }, strike]} numberOfLines={1}>{a.service_name}</Text>}
                        </Pressable>
                      </View>
                    );
                  })}
                  {d === today && nowMin > start && nowMin < end && (
                    <View pointerEvents="none" style={[s.now, { top: y(nowMin) }]}><View style={s.nowDot} /></View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  emptyText: { fontFamily: Font.body, fontSize: 14, color: Brand.muted, textAlign: "center", paddingVertical: 14 },
  reminder: { borderRadius: 12, backgroundColor: "#FEFBF7", borderWidth: 1, borderColor: "#F3ECE0", paddingHorizontal: 12, paddingVertical: 6 },
  remName: { fontFamily: Font.body, fontSize: 14, color: Brand.ink },
  remSub: { fontFamily: Font.body, fontSize: 12, color: Brand.muted },
  swatch: { width: 12, height: 12, borderRadius: 3, borderLeftWidth: 3 },
  legend: { fontFamily: Font.body, fontSize: 12, color: Brand.muted },
  grid: {
    backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 16, overflow: "hidden", width: "100%",
    shadowColor: "#2B221B", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  gridRow: { flexDirection: "row" },
  gridHead: { borderBottomWidth: 1, borderBottomColor: "#F0E7DA" },
  dayHead: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: Brand.lineSoft, gap: 2 },
  dow: { fontFamily: Font.bold, fontSize: 10.5, letterSpacing: 1.9, color: "#9A8B78" },
  dayNum: { fontFamily: Font.displayRegular, fontSize: 27, lineHeight: 34, color: Brand.ink },
  todayDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Brand.bronzeMid, alignItems: "center", justifyContent: "center" },
  dayInfo: { fontFamily: Font.body, fontSize: 11, color: Brand.muted },
  hourLabel: { position: "absolute", right: 8, fontFamily: Font.body, fontSize: 10.5, color: "#A69885" },
  col: { flex: 1, borderLeftWidth: 1, borderLeftColor: Brand.lineSoft },
  hourLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderTopColor: "#F0E7DA" },
  halfLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderTopColor: "#F8F2E8", borderStyle: "dashed" },
  closed: { position: "absolute", left: 0, right: 0, backgroundColor: "rgba(243,236,233,0.7)", alignItems: "center", justifyContent: "center" },
  closedText: { fontFamily: Font.body, fontSize: 10.5, color: "#A69885" },
  block: {
    position: "absolute", left: 0, right: 0, flexDirection: "row", gap: 4, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, zIndex: 2,
    backgroundColor: "rgba(143,128,112,0.1)", borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(143,128,112,0.4)",
  },
  blockText: { flex: 1, fontFamily: Font.body, fontSize: 11, color: Brand.muted },
  event: {
    flex: 1, borderRadius: 10, borderLeftWidth: 3, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden",
    shadowColor: "#2B221B", shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  evTime: { fontFamily: Font.bold, fontSize: 12 },
  evText: { fontFamily: Font.body, fontSize: 12, lineHeight: 15 },
  now: { position: "absolute", left: 0, right: 0, borderTopWidth: 2, borderTopColor: Brand.bronzeMid, zIndex: 6 },
  nowDot: { position: "absolute", left: -5, top: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.bronzeMid },
});
