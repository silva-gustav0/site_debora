import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, View, type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand } from "@/constants/brand";

/**
 * Componentes do app no visual do painel (bronze e creme). Telas usam só estes blocos,
 * para ficarem consistentes no celular e no tablet.
 */

export type IconName = keyof typeof Ionicons.glyphMap;
export { Ionicons };

export const TONES = {
  gold: { bg: "#FFF6DD", fg: "#7A5510", bd: "#EED9A0" },
  bronze: { bg: "#FAF2E4", fg: "#6B4A10", bd: "#EEDFBF" },
  green: { bg: "#EAF6EE", fg: "#1F6B3A", bd: "#BFE3CB" },
  gray: { bg: "#F3F1EC", fg: "#5E564D", bd: "#E0DAD0" },
  red: { bg: "#FDECEC", fg: "#9B2C2C", bd: "#F2C1C1" },
  blue: { bg: "#EEF1FB", fg: "#34459A", bd: "#CBD3F0" },
  plum: { bg: "#F6EEF8", fg: "#6B2E7A", bd: "#E1CBE8" },
} as const;
export type Tone = keyof typeof TONES;

// ─── Estrutura ─────────────────────────────────────────────────────────
/** Tela com rolagem, cabeçalho opcional com voltar e margem segura. */
export function Screen({ title, subtitle, back, right, children, scroll = true, onRefresh }: {
  title?: string; subtitle?: string; back?: boolean; right?: ReactNode; children: ReactNode; scroll?: boolean; onRefresh?: () => void;
}) {
  const header = (title || back) && (
    <View style={s.header}>
      {back && (
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.back} accessibilityLabel="Voltar">
          <Ionicons name="chevron-back" size={24} color={Brand.bronze} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        {title && <Text style={s.title} numberOfLines={1}>{title}</Text>}
        {subtitle && <Text style={s.muted} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
        >
          <View style={s.maxWidth}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[s.contentFlex]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ title, eyebrow, right, children, style, onPress }: {
  title?: string; eyebrow?: string; right?: ReactNode; children?: ReactNode; style?: ViewStyle; onPress?: () => void;
}) {
  const body = (
    <>
      {(title || eyebrow || right) && (
        <View style={s.cardHead}>
          <View style={{ flex: 1 }}>
            {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
            {title && <Text style={s.cardTitle}>{title}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </>
  );
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && s.pressed]}>{body}</Pressable>
    : <View style={[s.card, style]}>{body}</View>;
}

export function Row({ children, gap = 8, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

/** Linha de lista tocável (cliente, lançamento, produto…). */
export function ListItem({ title, subtitle, right, left, onPress }: {
  title: string; subtitle?: string | null; right?: ReactNode; left?: ReactNode; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.item, pressed && s.pressed]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.muted} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={Brand.muted} />}
    </Pressable>
  );
}

export function Empty({ icon = "leaf-outline", text }: { icon?: IconName; text: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={28} color={Brand.gold} />
      <Text style={[s.muted, { textAlign: "center" }]}>{text}</Text>
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {right}
      </Row>
      {children}
    </View>
  );
}

export const Txt = {
  title: (p: { children: ReactNode }) => <Text style={s.title}>{p.children}</Text>,
  body: (p: { children: ReactNode; style?: object }) => <Text style={[s.body, p.style]}>{p.children}</Text>,
  muted: (p: { children: ReactNode; style?: object }) => <Text style={[s.muted, p.style]}>{p.children}</Text>,
  strong: (p: { children: ReactNode; style?: object }) => <Text style={[s.strong, p.style]}>{p.children}</Text>,
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg, borderColor: t.bd }]}>
      <Text style={[s.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: TONES.bronze.bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: Brand.bronze, fontWeight: "700", fontSize: size * 0.38 }}>{ini}</Text>
    </View>
  );
}

/** Número grande com rótulo (Início, Financeiro, Relatórios). */
export function Stat({ label, value, tone = "bronze", hint }: { label: string; value: string; tone?: Tone; hint?: string }) {
  return (
    <View style={[s.card, { flexGrow: 1, flexShrink: 1, minWidth: 140, gap: 2 }]}>
      <Text style={s.eyebrow}>{label}</Text>
      <Text style={[s.stat, { color: TONES[tone].fg }]}>{value}</Text>
      {hint && <Text style={s.muted}>{hint}</Text>}
    </View>
  );
}

// ─── Ações ─────────────────────────────────────────────────────────────
export function Button({ children, onPress, variant = "primary", icon, loading, disabled, small, style }: {
  children: ReactNode; onPress?: () => void | Promise<unknown>; variant?: "primary" | "ghost" | "danger" | "outline";
  icon?: IconName; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const [busy, setBusy] = useState(false);
  const v = VARIANTS[variant];
  const run = async () => {
    if (!onPress || busy) return;
    setBusy(true);
    try { await onPress(); } finally { setBusy(false); }
  };
  const spinning = loading || busy;
  return (
    <Pressable
      onPress={run} disabled={disabled || spinning}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: v.bg, borderColor: v.bd }, (disabled || spinning) && { opacity: 0.6 }, pressed && s.pressed, style]}
    >
      {spinning ? <ActivityIndicator color={v.fg} size="small" /> : icon && <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} />}
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: v.fg }]}>{children}</Text>
    </Pressable>
  );
}

const VARIANTS = {
  primary: { bg: Brand.bronze, bd: Brand.bronze, fg: Brand.white },
  ghost: { bg: "transparent", bd: "transparent", fg: Brand.bronze },
  outline: { bg: Brand.white, bd: Brand.line, fg: Brand.bronze },
  danger: { bg: Brand.white, bd: TONES.red.bd, fg: Brand.danger },
};

/** Botão de exclusão com confirmação no segundo toque (sem diálogo). */
export function ConfirmButton({ children = "Excluir", confirmText = "Confirmar exclusão", onConfirm, small = true }: {
  children?: ReactNode; confirmText?: string; onConfirm: () => void | Promise<unknown>; small?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return armed
    ? <Button variant="danger" small={small} icon="trash" onPress={async () => { try { await onConfirm(); } finally { setArmed(false); } }}>{confirmText}</Button>
    : <Button variant="ghost" small={small} icon="trash-outline" onPress={() => setArmed(true)}>{children}</Button>;
}

/** Botões de escolha única lado a lado (status, forma de pagamento…). */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segment, value === o.value && s.segmentOn]}>
          <Text style={[s.segmentText, value === o.value && { color: Brand.white }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && { backgroundColor: Brand.bronze, borderColor: Brand.bronze }]}>
      <Text style={[s.chipText, on && { color: Brand.white }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Campos ────────────────────────────────────────────────────────────
export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 140 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={Brand.muted} {...props}
        style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: "top" }, error && { borderColor: Brand.danger }, props.style]}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Valor em reais: aceita "1.234,56", "50" etc. `value` é o texto digitado; use parseMoney para o número. */
export function MoneyField(props: Omit<TextInputProps, "keyboardType"> & { label: string; hint?: string; error?: string | null }) {
  return <Field keyboardType="decimal-pad" placeholder="0,00" {...props} />;
}

export function parseMoney(v: string | null | undefined) {
  const raw = (v ?? "").replace(/\s|R\$/g, "");
  if (!raw) return NaN;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export const moneyText = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(Number(n)) ? "" : String(Number(n).toFixed(2)).replace(".", ","));

/** Seletor em lista (abre por cima), com busca quando há muitas opções. */
export function Select<T extends string>({ label, value, options, onChange, placeholder = "Escolher…", searchable }: {
  label: string; value: T | null; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void;
  placeholder?: string; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = q ? options.filter((o) => norm(o.label).includes(norm(q))) : options;
  return (
    <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 140 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox]}>
        <Text style={{ flex: 1, color: current ? Brand.text : Brand.muted, fontSize: 16 }} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={Brand.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => { setOpen(false); setQ(""); }} title={label}>
        {(searchable || options.length > 12) && (
          <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Buscar…" value={q} onChangeText={setQ} autoFocus placeholderTextColor={Brand.muted} />
        )}
        <FlatList
          data={list} keyExtractor={(o) => o.value} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onChange(item.value); setOpen(false); setQ(""); }} style={({ pressed }) => [s.option, pressed && s.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, item.value === value && { color: Brand.bronze, fontWeight: "700" }]}>{item.label}</Text>
                {item.hint && <Text style={s.muted}>{item.hint}</Text>}
              </View>
              {item.value === value && <Ionicons name="checkmark" size={20} color={Brand.bronze} />}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.muted}>Nada encontrado.</Text>}
        />
      </Sheet>
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data no formato do banco (AAAA-MM-DD), com calendário do Android. */
export function DateField({ label, value, onChange, optional }: { label: string; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const d = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 140 }}>
      <Text style={s.label}>{label}</Text>
      <Row>
        <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox, { flex: 1 }]}>
          <Text style={{ flex: 1, color: value ? Brand.text : Brand.muted, fontSize: 16 }}>{value ? value.split("-").reverse().join("/") : "Escolher data"}</Text>
          <Ionicons name="calendar-outline" size={18} color={Brand.muted} />
        </Pressable>
        {optional && value && <Button variant="ghost" small icon="close" onPress={() => onChange(null)}>Limpar</Button>}
      </Row>
      {open && (
        <DateTimePicker
          value={d} mode="date"
          onChange={(e, date) => { setOpen(false); if (e.type === "set" && date) onChange(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`); }}
        />
      )}
    </View>
  );
}

/** Horário HH:MM. */
export function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [h, m] = (value ?? "09:00").split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return (
    <View style={{ gap: 4, flexGrow: 1, flexShrink: 1, minWidth: 110 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox]}>
        <Text style={{ flex: 1, color: value ? Brand.text : Brand.muted, fontSize: 16 }}>{value ?? "Horário"}</Text>
        <Ionicons name="time-outline" size={18} color={Brand.muted} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={d} mode="time" is24Hour minuteInterval={5}
          onChange={(e, date) => { setOpen(false); if (e.type === "set" && date) onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`); }}
        />
      )}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggle}>
      <Ionicons name={value ? "checkbox" : "square-outline"} size={22} color={Brand.bronze} />
      <View style={{ flex: 1 }}>
        <Text style={s.body}>{label}</Text>
        {hint && <Text style={s.muted}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

// ─── Janelas ───────────────────────────────────────────────────────────
/** Painel que sobe de baixo (formulários rápidos, escolhas). */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <Row style={{ justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={s.cardTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar"><Ionicons name="close" size={24} color={Brand.muted} /></Pressable>
        </Row>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 640 }} contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

// ─── Avisos rápidos ────────────────────────────────────────────────────
type ToastMsg = { text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: ToastMsg["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const show = useCallback((text: string, tone: ToastMsg["tone"] = "ok") => {
    setMsg({ text, tone });
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setMsg(null));
  }, [opacity]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="none" style={[s.toast, { opacity, bottom: 24 + insets.bottom, backgroundColor: msg.tone === "ok" ? "#2B221B" : Brand.danger }]}>
          <Text style={{ color: Brand.white, fontSize: 15 }}>{msg.text}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const ui = StyleSheet.create({
  muted: { color: Brand.muted, fontSize: 14 },
  body: { color: Brand.text, fontSize: 16 },
  strong: { color: Brand.text, fontSize: 16, fontWeight: "700" },
  label: { color: Brand.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  back: { paddingRight: 4 },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  contentFlex: { flex: 1, paddingHorizontal: 16 },
  maxWidth: { width: "100%", maxWidth: 1100, alignSelf: "center", gap: 14 },
  title: { color: Brand.text, fontSize: 26, fontWeight: "600" },
  eyebrow: { color: Brand.gold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "700" },
  sectionTitle: { color: Brand.text, fontSize: 18, fontWeight: "700" },
  muted: ui.muted,
  body: ui.body,
  strong: ui.strong,
  card: { backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { color: Brand.text, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.7 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Brand.white, borderColor: Brand.line,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  itemTitle: { color: Brand.text, fontSize: 16, fontWeight: "600" },
  empty: { alignItems: "center", gap: 8, padding: 24 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 12, fontWeight: "700" },
  stat: { fontSize: 24, fontWeight: "700" },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  btnSmall: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: "700" },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  segment: { borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  segmentOn: { backgroundColor: Brand.bronze, borderColor: Brand.bronze },
  segmentText: { color: Brand.text, fontSize: 14, fontWeight: "600" },
  chip: { borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: Brand.text, fontSize: 13, fontWeight: "600" },
  label: ui.label,
  input: {
    backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: Brand.text,
  },
  selectBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { color: Brand.muted, fontSize: 12 },
  error: { color: Brand.danger, fontSize: 13 },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Brand.line },
  toggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  backdrop: { flex: 1, backgroundColor: "rgba(43,34,27,0.35)" },
  sheet: { backgroundColor: Brand.cream, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: "90%" },
  toast: { position: "absolute", left: 20, right: 20, borderRadius: 14, padding: 14, alignItems: "center" },
});
