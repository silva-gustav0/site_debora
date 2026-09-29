import { themeFor } from "@shared/attendance-themes";
import { firstName, fmtDate } from "@shared/format";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Chip, Empty, Field, type IconName, Ionicons, Row, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { CompleteForm, isOpen, useAppts, useRows } from "@/lib/agenda";
import { type Clock, clearAttendance, loadAttendance, type Notes, saveAttendance } from "@/lib/attendance-store";

/** Hora atual em ms (para eventos, fora da renderização). */
const nowMs = () => Date.now();
const pad = (n: number) => String(n).padStart(2, "0");

/** Cronômetro mm:ss (ou h:mm:ss). */
const fmtClock = (ms: number) => {
  const s = Math.floor(Math.abs(ms) / 1000), h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};

/** Tela do atendimento em andamento (tablet): cronômetro, cena do procedimento, observações rápidas e finalização. */
export default function Attendance() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useAppts("a.id = ?", [id])[0];
  const client = useRows<{ skin_type: string | null; allergies: string | null; health_notes: string | null }>(
    "select skin_type, allergies, health_notes from clients where id = ?", [a?.client_id ?? ""])[0];
  const last = useRows<{ record_date: string; procedure: string; observations: string | null; next_steps: string | null }>(
    "select record_date, procedure, observations, next_steps from session_records where client_id = ? order by record_date desc, created_at desc limit 1", [a?.client_id ?? ""])[0];
  const wide = useWindowDimensions().width >= 900;
  const open = !!a && isOpen(a.status);
  const [saved] = useState(() => loadAttendance(id));
  const [clock, setClockState] = useState<Clock | null>(saved?.clock ?? null);
  const [notes, setNotesState] = useState<Notes>(saved?.notes ?? { chips: {}, text: "" });
  const ref = useRef({ clock, notes });
  const [now, setNow] = useState(Date.now);
  const [tab, setTab] = useState("0");
  const [finishing, setFinishing] = useState(false);
  const [breath] = useState(() => new Animated.Value(0));
  const persist = (next: Partial<typeof ref.current>) => { ref.current = { ...ref.current, ...next }; saveAttendance(id, ref.current); };
  const setClock = (c: Clock) => { persist({ clock: c }); setClockState(c); };
  const setNotes = (n: Notes) => { persist({ notes: n }); setNotesState(n); };
  const minutes = a ? (a.duration_min ?? Math.max(15, Math.round((Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60_000))) : 60;

  useEffect(() => {
    const tick = () => {
      const t = Date.now();
      const old = ref.current.clock;
      let c = old ?? (open ? { startedAt: t, pausedAt: null, pausedTotal: 0, extraMin: 0, alerted: false } : null);
      if (c && !c.alerted && !c.pausedAt && t - c.startedAt - c.pausedTotal >= (minutes + c.extraMin) * 60_000) {
        Vibration.vibrate([0, 220, 120, 220]);
        c = { ...c, alerted: true };
      }
      if (c && c !== old) { ref.current = { ...ref.current, clock: c }; saveAttendance(id, ref.current); setClockState(c); }
      setNow(t);
    };
    const first = setTimeout(tick, 0), every = setInterval(tick, 500);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [open, id, minutes]);

  const paused = !!clock?.pausedAt;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ]));
    if (!paused) loop.start();
    return () => loop.stop();
  }, [breath, paused]);

  const total = (minutes + (clock?.extraMin ?? 0)) * 60_000;
  const elapsed = clock ? Math.max(0, (clock.pausedAt ?? now) - clock.startedAt - clock.pausedTotal) : 0;
  const remaining = total - elapsed;
  const overtime = !!clock && remaining <= 0;
  const togglePause = () => clock && setClock(clock.pausedAt ? { ...clock, pausedAt: null, pausedTotal: clock.pausedTotal + nowMs() - clock.pausedAt } : { ...clock, pausedAt: nowMs() });

  if (!a) return <Screen title="Atendimento" back><Empty text="Atendimento não encontrado." /></Screen>;
  const theme = themeFor(a.service_name ?? "", a.service_category);
  const group = theme.groups[Number(tab)];
  const toggleChip = (chip: string) => {
    const list = notes.chips[group.title] ?? [];
    setNotes({ ...notes, chips: { ...notes.chips, [group.title]: list.includes(chip) ? list.filter((c) => c !== chip) : [...list, chip] } });
  };
  const picked = (field: string) => theme.groups.filter((g) => g.field === field && notes.chips[g.title]?.length);
  const record = {
    observations: [...picked("observations").map((g) => `${g.title}: ${notes.chips[g.title].join(", ")}`), notes.text.trim()].filter(Boolean).join("\n"),
    products: picked("products_used").flatMap((g) => notes.chips[g.title]).join(", "),
    next: picked("next_steps").flatMap((g) => notes.chips[g.title]).join("; "),
    parameters: `Duração real: ${Math.max(1, Math.round(elapsed / 60_000))} min (previsto ${minutes} min)`,
  };
  const alerts = [
    client?.allergies && `Alergias: ${client.allergies}`, client?.health_notes && `Saúde: ${client.health_notes}`,
    client?.skin_type && `Pele: ${client.skin_type}`, a.notes && `Pedido: “${a.notes}”`,
  ].filter(Boolean).join(" · ");

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.from, flexDirection: wide ? "row" : "column" }]}>
      <View style={[s.stage, { backgroundColor: theme.to }]}>
        <Row>
          <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color="#fff" /></Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[s.eyebrow, { color: theme.glow }]}>{a.service_name}</Text>
            <Text style={s.name} numberOfLines={1}>{a.client_name ?? "Cliente"}</Text>
          </View>
        </Row>
        <View style={s.center}>
          <Animated.View style={[s.orb, { backgroundColor: theme.glow, opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.4] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) }] }]} />
          <Text style={[s.clock, overtime && { color: theme.glow }]}>{overtime ? `+${fmtClock(remaining)}` : fmtClock(clock ? remaining : minutes * 60_000)}</Text>
          <Text style={s.mood}>{!open ? "Atendimento já encerrado" : paused ? "Pausado" : overtime ? "Tempo previsto concluído" : `restantes · ${theme.mood}`}</Text>
          <View style={s.bar}><View style={[s.fill, { backgroundColor: theme.glow, width: `${Math.min(100, (elapsed / total) * 100)}%` }]} /></View>
        </View>
        {open && clock && (
          <Row wrap style={{ justifyContent: "center" }}>
            <Round icon={paused ? "play" : "pause"} label={paused ? "Retomar" : "Pausar"} onPress={togglePause} />
            <Round icon="add" label="5 min" onPress={() => setClock({ ...clock, extraMin: clock.extraMin + 5, alerted: false })} />
            <Round icon="checkmark-circle" label="Finalizar" onPress={() => setFinishing(true)} glow={theme.glow} />
          </Row>
        )}
      </View>

      <ScrollView style={[s.panel, wide ? { width: "38%" } : { maxHeight: "45%" }]} contentContainerStyle={{ gap: 10, padding: 16 }} keyboardShouldPersistTaps="handled">
        <Txt.strong>Observações</Txt.strong>
        {!!alerts && <Txt.muted style={{ color: "#6A4A10" }}>{alerts}</Txt.muted>}
        {last && <Txt.muted>Última sessão ({fmtDate(last.record_date, { year: undefined })}, {last.procedure}): {last.observations || last.next_steps || "sem anotações"}</Txt.muted>}
        <Segmented value={tab} onChange={setTab} options={theme.groups.map((g, i) => ({ value: String(i), label: `${g.title}${notes.chips[g.title]?.length ? ` ${notes.chips[g.title].length}` : ""}` }))} />
        <Row wrap>{group.chips.map((c) => <Chip key={c} label={c} on={notes.chips[group.title]?.includes(c)} onPress={() => toggleChip(c)} />)}</Row>
        <Field label="Anotações livres" multiline value={notes.text} onChangeText={(text) => setNotes({ ...notes, text })} placeholder={`Anotações livres sobre ${a.client_name ? firstName(a.client_name) : "a cliente"}…`} />
      </ScrollView>

      <Sheet visible={finishing} onClose={() => setFinishing(false)} title="Finalizar atendimento">
        <Txt.muted>{record.parameters}</Txt.muted>
        {record.observations || record.products || record.next ? (
          <>
            {!!record.observations && <Txt.body>{record.observations}</Txt.body>}
            {!!record.products && <Txt.muted>Produtos: {record.products}</Txt.muted>}
            {!!record.next && <Txt.muted>Orientações: {record.next}</Txt.muted>}
          </>
        ) : <Txt.muted>Só a duração. Volte e toque nas observações se quiser registrar mais.</Txt.muted>}
        <CompleteForm a={a} record={record} onDone={() => { clearAttendance(id); setFinishing(false); router.replace(`/agendamento/${id}`); }} />
      </Sheet>
    </SafeAreaView>
  );
}

/** Botão redondo do palco (claro quando recebe a cor de destaque). */
function Round({ icon, label, onPress, glow }: { icon: IconName; label: string; onPress: () => void; glow?: string }) {
  const fg = glow ? "#231B15" : "#fff";
  return (
    <Pressable onPress={onPress} style={[s.round, glow ? { backgroundColor: glow } : null]} accessibilityLabel={label}>
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={{ color: fg, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  stage: { flex: 1, padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  orb: { position: "absolute", width: 260, height: 260, borderRadius: 130 },
  eyebrow: { fontSize: 11, letterSpacing: 3, textTransform: "uppercase" },
  name: { color: "#fff", fontSize: 24 },
  clock: { color: "#fff", fontSize: 72, fontWeight: "300", fontVariant: ["tabular-nums"] },
  mood: { color: "rgba(255,255,255,0.6)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  bar: { width: "70%", height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { height: 4 },
  round: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, height: 56, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  panel: { backgroundColor: Brand.cream, flexGrow: 0 },
});
