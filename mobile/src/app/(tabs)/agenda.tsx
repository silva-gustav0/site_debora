import { addDays, brl, dateSP, fmtDate, fmtTime, fmtWeekday, todaySP, weekday } from "@shared/format";
import { freeSlots } from "@shared/hours";
import { router } from "expo-router";
import { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Badge, Button, Chip, ConfirmButton, DateField, Empty, ListItem, Row, Screen, Section, Segmented, Txt } from "@/components/ui";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { type Appt, ApptItem, between, ts, useAppts, useRows } from "@/lib/agenda";

type Block = { id: string; starts_at: string; ends_at: string; reason: string };

/** Agenda por dia ou semana, com bloqueios, horários livres e atalhos para agendar e bloquear. */
export default function Agenda() {
  const wide = useWindowDimensions().width >= 768;
  const settings = useSettings();
  const today = todaySP();
  const [d, setD] = useState(today);
  const [view, setView] = useState<"dia" | "semana">(wide ? "semana" : "dia");
  const monday = addDays(d, -((weekday(d) + 6) % 7));
  const from = view === "dia" ? d : monday;
  const to = view === "dia" ? d : addDays(monday, 6);
  const [where, ...params] = between(from, to);
  const appts = useAppts(where, params);
  const [bw, ...bp] = between(from, to, "starts_at");
  const blocks = useRows<Block>(`select id, ${ts("starts_at")} as starts_at, ${ts("ends_at")} as ends_at, reason from time_blocks where ${bw} order by datetime(starts_at)`, bp);
  const days = Array.from({ length: view === "dia" ? 1 : 7 }, (_, i) => addDays(from, i))
    .filter((day) => view === "dia" || weekday(day) !== 0 || appts.some((a) => dateSP(a.starts_at) === day));
  const active = appts.filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const pending = appts.filter((a) => a.status === "solicitado").length;
  const shift = view === "dia" ? 1 : 7;

  /** Atendimentos, bloqueios e (no dia) horários livres de uma data. */
  const renderDay = (day: string) => {
    const list = appts.filter((a) => dateSP(a.starts_at) === day);
    const dayBlocks = blocks.filter((b) => dateSP(b.starts_at) === day);
    const slots = view === "dia" ? freeSlots(day, settings.slot_step_min, [...list.filter((a) => a.status !== "cancelado"), ...dayBlocks], new Date(), settings.business_hours, settings.slot_step_min).filter((s) => s.available) : [];
    const items: { at: string; a?: Appt; b?: Block }[] = [...list.map((a) => ({ at: a.starts_at, a })), ...dayBlocks.map((b) => ({ at: b.starts_at, b }))].sort((x, y) => x.at.localeCompare(y.at));
    return (
      <Section key={day} title={`${fmtWeekday(day)}, ${fmtDate(day, { year: undefined })}${day === today ? " · hoje" : ""}`} right={<Badge>{String(list.filter((a) => a.status !== "cancelado").length)}</Badge>}>
        {!items.length && <Empty text="Nenhum atendimento." />}
        {items.map(({ a, b }) => (a ? <ApptItem key={a.id} a={a} /> : b && (
          <ListItem
            key={b.id} title={b.reason} subtitle={`Bloqueado · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`} left={<Badge tone="gray">Bloqueio</Badge>}
            right={<ConfirmButton confirmText="Remover bloqueio" onConfirm={() => write((w) => w.remove("time_blocks", b.id))}>Liberar</ConfirmButton>}
          />
        )))}
        {slots.length > 0 && (
          <>
            <Txt.muted>Horários livres (toque para agendar)</Txt.muted>
            <Row wrap>{slots.map((s) => <Chip key={s.time} label={s.time} onPress={() => router.push({ pathname: "/agenda/novo", params: { date: day, time: s.time } })} />)}</Row>
          </>
        )}
      </Section>
    );
  };

  return (
    <Screen
      title={view === "dia" ? `${fmtWeekday(d, "long")}, ${fmtDate(d, { month: "long", year: undefined })}` : `Semana de ${fmtDate(monday, { year: undefined })}`}
      subtitle={`${active.length} atendimentos · ${brl(active.reduce((s, a) => s + Number(a.price), 0))} previstos${pending ? ` · ${pending} a confirmar` : ""}`}
    >
      <Row wrap>
        <Segmented value={view} options={[{ value: "dia", label: "Dia" }, { value: "semana", label: "Semana" }]} onChange={setView} />
        <Button small variant="outline" icon="chevron-back" onPress={() => setD(addDays(d, -shift))}>{""}</Button>
        <Button small variant="outline" onPress={() => setD(today)}>Hoje</Button>
        <Button small variant="outline" icon="chevron-forward" onPress={() => setD(addDays(d, shift))}>{""}</Button>
      </Row>
      <Row wrap>
        <DateField label="Ir para data" value={d} onChange={(v) => v && setD(v)} />
        <Button small variant="outline" icon="lock-closed-outline" onPress={() => router.push({ pathname: "/agenda/bloqueio", params: { date: d } })}>Bloquear</Button>
        <Button small icon="add" onPress={() => router.push({ pathname: "/agenda/novo", params: { date: d < today ? today : d } })}>Agendar</Button>
      </Row>
      {wide && view === "semana" ? (
        <Row gap={10} style={{ alignItems: "flex-start" }}>
          {days.map((day) => <View key={day} style={{ flex: 1 }}>{renderDay(day)}</View>)}
        </Row>
      ) : days.map(renderDay)}
    </Screen>
  );
}
