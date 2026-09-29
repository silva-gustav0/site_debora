import { themeFor } from "@shared/attendance-themes";
import { firstName, fmtDate } from "@shared/format";
import { useKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, History, NotebookPen, Pause, Play, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, G, Path } from "react-native-svg";
import { Empty, Screen, Sheet, Txt } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { CompleteForm, isOpen, Label, useAppts, useRows } from "@/lib/agenda";
import { type Clock, clearAttendance, loadAttendance, type Notes, saveAttendance } from "@/lib/attendance-store";

const FACIAL = ["limpeza", "peeling", "microagulhamento", "manchas", "rejuvenescimento"];
const CHEEK = [[84, 134, 2.2], [92, 144, 2], [80, 150, 1.8], [96, 128, 1.6], [150, 134, 2.2], [158, 146, 2], [146, 150, 1.8], [162, 128, 1.6]];
const R = 47, C = 2 * Math.PI * R;

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
  const { width, height } = useWindowDimensions();
  const wide = width >= 900;
  const ring = Math.min(420, Math.min(width * (wide ? 0.68 : 1), height * (wide ? 1 : 0.58)) * 0.5);
  const open = !!a && isOpen(a.status);
  const [saved] = useState(() => loadAttendance(id));
  const [clock, setClockState] = useState<Clock | null>(saved?.clock ?? null);
  const [notes, setNotesState] = useState<Notes>(saved?.notes ?? { chips: {}, text: "" });
  const ref = useRef({ clock, notes });
  const [now, setNow] = useState(Date.now);
  const [tab, setTab] = useState("0");
  const [finishing, setFinishing] = useState(false);
  const [minimized, setMinimized] = useState(false);
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

  const noteCount = Object.values(notes.chips).reduce((n, l) => n + l.length, 0) + (notes.text.trim() ? 1 : 0);
  const progress = clock ? Math.min(1, elapsed / total) : 0;
  const clockSize = Math.max(56, Math.min(104, Math.min(width, height) * 0.1));
  const count = noteCount > 0 && <Text style={s.count}>{noteCount}</Text>;

  return (
    <View style={[s.root, { flexDirection: wide && !minimized ? "row" : "column" }]}>
      <LinearGradient colors={[theme.to, theme.from]} start={{ x: 0.3, y: 0.2 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["top", "left"]} style={s.stage}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backPill} hitSlop={8}><ArrowLeft size={15} color="rgba(255,255,255,0.75)" /><Text style={s.backText}>Agenda</Text></Pressable>
          <View style={{ flex: 1, alignItems: "center", paddingRight: 90 }}>
            <Text style={[s.eyebrow, { color: theme.glow }]} numberOfLines={1}>{(a.service_name ?? "").toUpperCase()}</Text>
            <Text style={s.name} numberOfLines={1}>{a.client_name ?? "Cliente"}</Text>
          </View>
        </View>
        <View style={s.center}>
          <View style={{ width: ring, height: ring, alignItems: "center", justifyContent: "center" }}>
            <Animated.View style={[s.orb, { width: ring * 0.6, height: ring * 0.6, borderRadius: ring * 0.3, backgroundColor: theme.glow, opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.16] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.1] }) }] }]} />
            <Svg viewBox="0 0 100 100" style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
              <Circle cx={50} cy={50} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1.6} />
              <Circle cx={50} cy={50} r={R} fill="none" stroke={theme.glow} strokeWidth={1.8} strokeLinecap="round" strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - progress)} />
            </Svg>
            {FACIAL.includes(theme.scene) && (
              <Svg viewBox="0 0 240 240" style={{ width: ring * 0.7, height: ring * 0.7, opacity: paused ? 0.4 : 1 }}>
                <G fill="none" stroke={theme.glow} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M120 38c-38 0-62 32-62 78 0 44 28 84 62 84s62-40 62-84c0-46-24-78-62-78Z" />
                  <Path d="M62 96c10-34 34-52 58-52s50 16 60 50" opacity={0.45} />
                  <Path d="M92 114q10 7 20 0M128 114q10 7 20 0" />
                  <Path d="M120 122l-5 22q5 3 10 0" opacity={0.7} />
                  <Path d="M108 162q12 7 24 0" />
                  <Path d="M96 196v30M144 196v30" opacity={0.5} />
                </G>
                {(theme.scene === "manchas" || theme.scene === "microagulhamento") && CHEEK.map(([x, y, r]) => (
                  <Circle key={`${x}-${y}`} cx={x} cy={y} r={theme.scene === "manchas" ? r * 2.4 : r} fill={theme.glow} opacity={0.5} />
                ))}
              </Svg>
            )}
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={[s.clock, { fontSize: clockSize, lineHeight: clockSize * 1.05 }, overtime && { color: theme.glow }]}>
              {overtime ? `+${fmtClock(remaining)}` : fmtClock(clock ? remaining : minutes * 60_000)}
            </Text>
            <Text style={s.mood}>{(!open ? "Atendimento já encerrado" : paused ? "Pausado" : overtime ? "Tempo previsto concluído" : `restantes · ${theme.mood}`).toUpperCase()}</Text>
          </View>
          {open && clock && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
              <Pressable onPress={togglePause} style={[s.round, { width: 64, paddingHorizontal: 0 }]} accessibilityLabel={paused ? "Retomar" : "Pausar"}>
                {paused ? <Play size={24} color="#fff" /> : <Pause size={24} color="#fff" />}
              </Pressable>
              <Pressable onPress={() => setClock({ ...clock, extraMin: clock.extraMin + 5, alerted: false })} style={s.round}>
                <Plus size={17} color="#fff" /><Text style={s.roundText}>5 min</Text>
              </Pressable>
              <Pressable onPress={() => setFinishing(true)}>
                <LinearGradient colors={["#FFFFFF", theme.glow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.round, { borderWidth: 0, paddingHorizontal: 24 }]}>
                  <CheckCircle2 size={19} color="#231B15" /><Text style={[s.roundText, { color: "#231B15", fontFamily: Font.bold }]}>Finalizar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>

      {minimized ? (
        <Pressable onPress={() => setMinimized(false)} style={s.fab} accessibilityLabel="Abrir observações">
          <NotebookPen size={18} color={Brand.bronzeMid} /><Text style={[s.roundText, { color: Brand.ink }]}>Observações</Text>{count}
        </Pressable>
      ) : (
        <SafeAreaView edges={wide ? ["top", "bottom", "right"] : ["bottom"]} style={[s.panel, wide ? s.panelWide : s.panelTall]}>
          <View style={s.panelHead}>
            <NotebookPen size={17} color={Brand.bronzeMid} />
            <Text style={s.panelTitle}>Observações</Text>
            {count}
            <Pressable onPress={() => setMinimized(true)} style={s.minimize} accessibilityLabel="Minimizar observações"><ChevronDown size={20} color={Brand.body} /></Pressable>
          </View>
          {!!alerts && <View style={s.warn}><AlertTriangle size={14} color="#6A4A10" /><Text style={[s.small, { color: "#6A4A10" }]}>{alerts}</Text></View>}
          {last && (
            <View style={[s.warn, { backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.line }]}>
              <History size={14} color={Brand.bronzeMid} />
              <Text style={[s.small, { color: Brand.body }]} numberOfLines={2}>Última sessão ({fmtDate(last.record_date, { year: undefined })}, {last.procedure}): {last.observations || last.next_steps || "sem anotações"}</Text>
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20, paddingBottom: 8 }}>
            {theme.groups.map((g, i) => {
              const on = tab === String(i), n = notes.chips[g.title]?.length ?? 0;
              return (
                <Pressable key={g.title} onPress={() => setTab(String(i))} style={[s.tab, on && s.tabOn]}>
                  <Text style={[s.tabText, on && { color: Brand.white }]}>{g.title}{n > 0 && <Text style={{ fontSize: 11, color: on ? Brand.goldLight : Brand.bronzeMid }}>{`  ${n}`}</Text>}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingVertical: 8 }}>
            {group.chips.map((c) => {
              const on = notes.chips[group.title]?.includes(c);
              return (
                <Pressable key={c} onPress={() => toggleChip(c)} style={[s.chip, on && s.chipOn]}>
                  {on && <Check size={14} color={Brand.white} />}<Text style={[s.chipText, on && { color: Brand.white }]}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
            <TextInput
              multiline value={notes.text} onChangeText={(text) => setNotes({ ...notes, text })} placeholderTextColor={Brand.placeholder} style={s.textarea}
              placeholder={`Anotações livres sobre ${a.client_name ? firstName(a.client_name) : "a cliente"}…`}
            />
          </View>
        </SafeAreaView>
      )}

      <Sheet visible={finishing} onClose={() => setFinishing(false)} title="Finalizar atendimento">
        <Text style={s.sheetTitle}>{a.service_name ?? "Atendimento"}</Text>
        <Txt.muted>{record.parameters}</Txt.muted>
        <View style={s.recordBox}>
          <Label>Vai para o prontuário</Label>
          {record.observations || record.products || record.next ? (
            <>
              {!!record.observations && <Txt.body style={{ fontSize: 14 }}>{record.observations}</Txt.body>}
              {!!record.products && <Txt.muted>Produtos: {record.products}</Txt.muted>}
              {!!record.next && <Txt.muted>Orientações: {record.next}</Txt.muted>}
            </>
          ) : <Txt.muted>Só a duração. Volte e toque nas observações se quiser registrar mais.</Txt.muted>}
        </View>
        <CompleteForm a={a} record={record} onDone={() => { clearAttendance(id); setFinishing(false); router.replace(`/agendamento/${id}`); }} />
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#231B15", overflow: "hidden" },
  stage: { flex: 1, minHeight: 0 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingTop: 16 },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  backText: { fontFamily: Font.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  eyebrow: { fontFamily: Font.body, fontSize: 10, letterSpacing: 3 },
  name: { fontFamily: Font.displayRegular, fontSize: 25, color: Brand.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  orb: { position: "absolute" },
  clock: { fontFamily: Font.display, color: Brand.white, fontVariant: ["tabular-nums"] },
  mood: { fontFamily: Font.body, fontSize: 12, letterSpacing: 2.9, color: "rgba(255,255,255,0.55)", marginTop: 6 },
  round: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 64, borderRadius: 32, paddingHorizontal: 20,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  roundText: { fontFamily: Font.body, fontSize: 15, color: Brand.white },
  fab: {
    position: "absolute", right: 20, bottom: 20, flexDirection: "row", alignItems: "center", gap: 8, height: 48, borderRadius: 24, paddingHorizontal: 16,
    backgroundColor: "#FBF7F0", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 30, elevation: 12,
  },
  count: { fontFamily: Font.bold, fontSize: 11, color: Brand.goldLight, backgroundColor: Brand.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: "hidden" },
  panel: { backgroundColor: "#FBF7F0", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 40, elevation: 16 },
  panelWide: { width: "32%", minWidth: 360, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
  panelTall: { height: "42%", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  panelTitle: { flex: 1, fontFamily: Font.displayRegular, fontSize: 25, color: Brand.ink },
  minimize: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  warn: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#FFF3DC" },
  small: { flex: 1, fontFamily: Font.body, fontSize: 12.5 },
  tab: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Brand.inputLine, backgroundColor: Brand.white },
  tabOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  tabText: { fontFamily: Font.body, fontSize: 13, color: Brand.body },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Brand.inputLine, backgroundColor: Brand.white },
  chipOn: { backgroundColor: Brand.bronzeMid, borderColor: Brand.bronzeMid },
  chipText: { fontFamily: Font.body, fontSize: 14, color: "#3B2E24" },
  textarea: {
    minHeight: 76, textAlignVertical: "top", backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.inputLine, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontFamily: Font.body, fontSize: 15, color: Brand.ink,
  },
  sheetTitle: { fontFamily: Font.displayRegular, fontSize: 30, color: Brand.ink },
  recordBox: { borderRadius: 16, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, padding: 16, gap: 6 },
});
