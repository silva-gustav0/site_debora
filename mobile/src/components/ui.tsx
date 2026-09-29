import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronLeft, type LucideIcon } from "lucide-react-native";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  type TextInputProps, useWindowDimensions, View, type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Brand, Font } from "@/constants/brand";

// Componentes no visual do painel web (globals.css: .p-card, .p-btn, .p-input, .p-chip, .p-tabs…).

export type IconName = keyof typeof Ionicons.glyphMap;
/** Ícone do Lucide (igual ao painel) ou nome do Ionicons. */
export type AnyIcon = IconName | LucideIcon;
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

/** Desenha um ícone do Lucide ou do Ionicons. */
export function Icon({ icon, size = 16, color = Brand.muted }: { icon: AnyIcon; size?: number; color?: string }) {
  if (typeof icon === "string") return <Ionicons name={icon} size={size} color={color} />;
  const L = icon;
  return <L size={size} color={color} strokeWidth={1.8} />;
}

/** Largura de tablet (menu lateral do painel). */
export const useWide = () => useWindowDimensions().width >= 768;

// ─── Estrutura ─────────────────────────────────────────────────────────
/** Tela com o cabeçalho do painel (linha dourada + título grande) e rolagem. */
export function Screen({ title, eyebrow, subtitle, back, right, children, scroll = true, onRefresh }: {
  title?: ReactNode; eyebrow?: string; subtitle?: ReactNode; back?: boolean; right?: ReactNode; children: ReactNode; scroll?: boolean; onRefresh?: () => void;
}) {
  const wide = useWide();
  const pad = wide ? { paddingHorizontal: 40, paddingTop: 34 } : { paddingHorizontal: 16, paddingTop: 20 };
  const header = (title || back) && (
    <View style={[s.header, !wide && { flexDirection: "column", alignItems: "flex-start" }]}>
      <View style={{ flex: 1, gap: 4 }}>
        {back && (
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.back} accessibilityLabel="Voltar">
            <ChevronLeft size={15} color={Brand.body} /><Text style={s.backText}>Voltar</Text>
          </Pressable>
        )}
        {eyebrow && <Text style={s.eyebrow}>{eyebrow.toUpperCase()}</Text>}
        {title && (typeof title === "string" ? <Text style={[s.title, !wide && { fontSize: 38 }]}>{title}</Text> : title)}
        {subtitle && (typeof subtitle === "string" ? <Text style={s.subtitle}>{subtitle}</Text> : subtitle)}
      </View>
      {right && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>{right}</View>}
    </View>
  );
  return (
    <SafeAreaView style={s.screen} edges={wide ? ["top", "right"] : ["left", "right"]}>
      <LinearGradient pointerEvents="none" colors={["rgba(232,200,130,0.16)", "rgba(232,200,130,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.45 }} style={StyleSheet.absoluteFill} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[s.content, pad]} keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
        >
          <View style={s.maxWidth}>{header}{children}</View>
        </ScrollView>
      ) : (
        <View style={[s.contentFlex, pad]}>{header}{children}</View>
      )}
    </SafeAreaView>
  );
}

/** Cartão do painel: cabeçalho com linha dourada/título serifado e divisória; `gold` põe o filete dourado no topo. */
export function Card({ title, eyebrow, right, children, style, onPress, gold, bodyStyle }: {
  title?: ReactNode; eyebrow?: string; right?: ReactNode; children?: ReactNode; style?: ViewStyle; onPress?: () => void; gold?: boolean; bodyStyle?: ViewStyle;
}) {
  const head = (title || eyebrow || right) && (
    <View style={[s.cardHead, !!children && s.cardHeadLine]}>
      <View style={{ flex: 1 }}>
        {eyebrow && <Text style={[s.eyebrow, { fontSize: 9.5 }]}>{eyebrow.toUpperCase()}</Text>}
        {title && (typeof title === "string" ? <Text style={s.cardTitle}>{title}</Text> : title)}
      </View>
      {right}
    </View>
  );
  const body = (
    <>
      {gold && <LinearGradient colors={["transparent", Brand.goldSoft, Brand.gold, "transparent"]} locations={[0, 0.3, 0.7, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.goldLine} />}
      {head}
      {children !== undefined && children !== null && <View style={[s.cardBody, bodyStyle]}>{children}</View>}
    </>
  );
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && s.pressed]}>{body}</Pressable>
    : <View style={[s.card, style]}>{body}</View>;
}

export function Row({ children, gap = 8, wrap, style }: { children: ReactNode; gap?: number; wrap?: boolean; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

/** Linha de lista tocável (cliente, lançamento, produto…), como as linhas do painel. */
export function ListItem({ title, subtitle, right, left, onPress, accent }: {
  title: string; subtitle?: string | null; right?: ReactNode; left?: ReactNode; onPress?: () => void; accent?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.item, accent ? { borderLeftWidth: 3, borderLeftColor: accent } : null, pressed && s.pressed]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={s.itemTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={s.small} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={16} color={Brand.placeholder} />}
    </Pressable>
  );
}

/** Estado vazio: ícone num círculo dourado e texto. */
export function Empty({ icon = "sparkles-outline", text }: { icon?: AnyIcon; text: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}><Icon icon={icon} size={20} color={Brand.gold} /></View>
      <Text style={[s.body, { color: Brand.muted, textAlign: "center", fontSize: 14 }]}>{text}</Text>
    </View>
  );
}

export function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={s.cardTitle}>{title}</Text>
        {right}
      </Row>
      {children}
    </View>
  );
}

export const Txt = {
  title: (p: { children: ReactNode }) => <Text style={s.title}>{p.children}</Text>,
  display: (p: { children: ReactNode; style?: object }) => <Text style={[s.cardTitle, p.style]}>{p.children}</Text>,
  body: (p: { children: ReactNode; style?: object }) => <Text style={[s.body, p.style]}>{p.children}</Text>,
  muted: (p: { children: ReactNode; style?: object }) => <Text style={[s.muted, p.style]}>{p.children}</Text>,
  strong: (p: { children: ReactNode; style?: object }) => <Text style={[s.strong, p.style]}>{p.children}</Text>,
  eyebrow: (p: { children: string; style?: object }) => <Text style={[s.eyebrow, p.style]}>{p.children.toUpperCase()}</Text>,
};

export function Badge({ tone = "gray", icon, children }: { tone?: Tone; icon?: AnyIcon; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg, borderColor: t.bd, flexDirection: "row", alignItems: "center", gap: 4 }]}>
      {icon && <Icon icon={icon} size={11} color={t.fg} />}
      <Text style={[s.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const AVATAR = ["#7C8FD6", "#C9973A", "#8FB59A", "#C98A9A", "#9A8BC9", "#6FA7B5", "#B58F6F"];
/** Avatar com iniciais e cor fixa por nome (como no painel). */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const ini = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const color = AVATAR[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: Brand.white, fontFamily: Font.bold, fontSize: size * 0.34 }}>{ini}</Text>
    </View>
  );
}

/** Indicador do Início/Financeiro: rótulo, ícone num círculo, número grande serifado; `dark` = cartão escuro de destaque. */
export function Stat({ label, value, tone = "bronze", hint, icon, dark }: { label: string; value: string; tone?: Tone; hint?: ReactNode; icon?: AnyIcon; dark?: boolean }) {
  const inner = (
    <>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={[s.eyebrow, { fontSize: 10, color: dark ? Brand.goldSoft : "#8F7F6B", flex: 1 }]}>{label.toUpperCase()}</Text>
        {icon && <View style={[s.statIcon, dark && { backgroundColor: "rgba(232,200,130,0.18)" }]}><Icon icon={icon} size={15} color={dark ? Brand.goldSoft : Brand.gold} /></View>}
      </Row>
      <Text style={[s.stat, { color: dark ? Brand.white : tone === "red" ? Brand.danger : Brand.ink }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {hint && (typeof hint === "string" ? <Text style={[s.small, dark && { color: "rgba(255,255,255,0.6)" }]}>{hint}</Text> : hint)}
    </>
  );
  return dark
    ? <LinearGradient colors={["#2B221B", "#48392B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.statCard, { borderColor: "#2B221B" }]}>{inner}</LinearGradient>
    : <View style={s.statCard}>{inner}</View>;
}

// ─── Ações ─────────────────────────────────────────────────────────────
type Variant = "primary" | "gold" | "outline" | "ghost" | "danger";
/** Botão do painel: primary (degradê bronze), gold, outline (branco com borda), ghost (link), danger. */
export function Button({ children, onPress, variant = "primary", icon, loading, disabled, small, style }: {
  children: ReactNode; onPress?: () => void | Promise<unknown>; variant?: Variant;
  icon?: AnyIcon; loading?: boolean; disabled?: boolean; small?: boolean; style?: ViewStyle;
}) {
  const [busy, setBusy] = useState(false);
  const v = VARIANTS[variant];
  const run = async () => {
    if (!onPress || busy) return;
    setBusy(true);
    try { await onPress(); } finally { setBusy(false); }
  };
  const spinning = loading || busy;
  const content = (
    <>
      {spinning ? <ActivityIndicator color={v.fg} size="small" /> : icon && <Icon icon={icon} size={small ? 14 : 16} color={v.fg} />}
      <Text style={[s.btnText, small && { fontSize: 13 }, { color: v.fg }, variant === "ghost" && { fontFamily: Font.body }]}>{children}</Text>
    </>
  );
  const box = [s.btn, small && s.btnSmall, { borderColor: v.bd }, variant === "ghost" && s.btnGhost, (disabled || spinning) && { opacity: 0.6 }, style];
  return (
    <Pressable onPress={run} disabled={disabled || spinning} style={({ pressed }) => [{ flex: style?.flex, flexGrow: style?.flexGrow, alignSelf: style?.alignSelf }, pressed && { transform: [{ scale: 0.96 }] }]}>
      {v.grad
        ? <LinearGradient colors={v.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[...box, s.btnShadow]}>{content}</LinearGradient>
        : <View style={[...box, { backgroundColor: v.bg }]}>{content}</View>}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; bd: string; fg: string; grad?: [string, string, ...string[]] }> = {
  primary: { bg: Brand.bronze, bd: Brand.bronzeDark, fg: Brand.white, grad: ["#82590F", "#6B4A10"] },
  gold: { bg: Brand.gold, bd: "#A87B25", fg: Brand.white, grad: ["#D8AE5A", "#C9973A", "#A87B25"] },
  outline: { bg: Brand.white, bd: Brand.inputLine, fg: Brand.body },
  ghost: { bg: "transparent", bd: "transparent", fg: Brand.bronzeDark },
  danger: { bg: Brand.white, bd: Brand.inputLine, fg: Brand.danger },
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
    : <Button variant="danger" small={small} icon="trash-outline" onPress={() => setArmed(true)}>{children}</Button>;
}

/** Escolha única em pílulas (Dia/Semana, status…): a ativa fica escura, como no painel. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <View style={s.segmented}>
      {options.map((o) => <Chip key={o.value} label={o.label} on={value === o.value} onPress={() => onChange(o.value)} />)}
    </View>
  );
}

/** Abas sublinhadas do painel (.p-tabs): a ativa em negrito com traço dourado. */
export function Tabs<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ gap: 2 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.tab, value === o.value && s.tabOn]}>
          <Text style={[s.tabText, value === o.value && { color: Brand.ink, fontFamily: Font.bold }]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.chip, on && s.chipOn, pressed && { transform: [{ scale: 0.96 }] }]}>
      <Text style={[s.chipText, on && { color: Brand.white }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Campos ────────────────────────────────────────────────────────────
export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={s.fieldBox}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={Brand.placeholder} {...props}
        onFocus={(e) => { setFocus(true); props.onFocus?.(e); }} onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
        style={[s.input, focus && s.inputFocus, props.multiline && { minHeight: 90, textAlignVertical: "top" }, error && { borderColor: Brand.danger }, props.style]}
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
    <View style={s.fieldBox}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox]}>
        <Text style={[s.inputText, !current && { color: Brand.placeholder }]} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={Brand.muted} />
      </Pressable>
      <Sheet visible={open} onClose={() => { setOpen(false); setQ(""); }} title={label}>
        {(searchable || options.length > 12) && (
          <TextInput style={[s.input, { marginBottom: 8 }]} placeholder="Buscar…" value={q} onChangeText={setQ} autoFocus placeholderTextColor={Brand.placeholder} />
        )}
        <FlatList
          data={list} keyExtractor={(o) => o.value} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}
          renderItem={({ item }) => (
            <Pressable onPress={() => { onChange(item.value); setOpen(false); setQ(""); }} style={({ pressed }) => [s.option, pressed && s.pressed]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, item.value === value && { color: Brand.bronze, fontFamily: Font.bold }]}>{item.label}</Text>
                {item.hint && <Text style={s.small}>{item.hint}</Text>}
              </View>
              {item.value === value && <Ionicons name="checkmark" size={18} color={Brand.bronze} />}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.muted}>Nada encontrado.</Text>}
        />
      </Sheet>
    </View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Data no formato do banco (AAAA-MM-DD), com calendário do Android. */
export function DateField({ label, value, onChange, optional }: { label: string; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  const [open, setOpen] = useState(false);
  const d = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <View style={s.fieldBox}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <Row>
        <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox, { flex: 1 }]}>
          <Text style={[s.inputText, !value && { color: Brand.placeholder }]}>{value ? value.split("-").reverse().join("/") : "Escolher data"}</Text>
          <Ionicons name="calendar-outline" size={16} color={Brand.muted} />
        </Pressable>
        {optional && value && <Button variant="ghost" small icon="close" onPress={() => onChange(null)}>Limpar</Button>}
      </Row>
      {open && (
        <DateTimePicker
          value={d} mode="date"
          onChange={(e, date) => { setOpen(false); if (e.type === "set" && date) onChange(`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`); }}
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
    <View style={[s.fieldBox, { minWidth: 110 }]}>
      <Text style={s.label}>{label.toUpperCase()}</Text>
      <Pressable onPress={() => setOpen(true)} style={[s.input, s.selectBox]}>
        <Text style={[s.inputText, !value && { color: Brand.placeholder }]}>{value ?? "Horário"}</Text>
        <Ionicons name="time-outline" size={16} color={Brand.muted} />
      </Pressable>
      {open && (
        <DateTimePicker
          value={d} mode="time" is24Hour minuteInterval={5}
          onChange={(e, date) => { setOpen(false); if (e.type === "set" && date) onChange(`${pad2(date.getHours())}:${pad2(date.getMinutes())}`); }}
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
        {hint && <Text style={s.small}>{hint}</Text>}
      </View>
    </Pressable>
  );
}

// ─── Janelas ───────────────────────────────────────────────────────────
/** Formulários e detalhes: gaveta pela direita no tablet (como o painel) e painel de baixo no celular. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <Modal visible={visible} transparent animationType={wide ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[wide ? s.drawer : s.sheet, { paddingBottom: 16 + insets.bottom, paddingTop: wide ? 20 + insets.top : 18 }]}>
          <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={s.cardTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar"><Ionicons name="close" size={22} color={Brand.muted} /></Pressable>
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" style={wide ? { flex: 1 } : { maxHeight: 640 }} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>{children}</ScrollView>
        </View>
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
        <Animated.View pointerEvents="none" style={[s.toast, { opacity, top: 16 + insets.top }]}>
          <LinearGradient colors={msg.tone === "ok" ? ["#2B221B", "#48392B"] : [Brand.danger, "#7A2222"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.toastInner}>
            <Text style={{ color: Brand.white, fontSize: 14.5, fontFamily: Font.body }}>{msg.text}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const ui = StyleSheet.create({
  muted: { color: Brand.muted, fontSize: 14, fontFamily: Font.body },
  body: { color: Brand.ink, fontSize: 15, fontFamily: Font.body },
  strong: { color: Brand.ink, fontSize: 15, fontFamily: Font.bold },
  label: { color: Brand.label, fontSize: 11, fontFamily: Font.body, letterSpacing: 0.9 },
  display: { color: Brand.ink, fontFamily: Font.displayRegular },
});

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.canvas },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 12 },
  back: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", marginBottom: 4 },
  backText: { fontFamily: Font.body, fontSize: 13, color: Brand.body },
  content: { paddingBottom: 56, gap: 16 },
  contentFlex: { flex: 1, gap: 16 },
  maxWidth: { width: "100%", maxWidth: 1400, alignSelf: "center", gap: 16 },
  title: { color: Brand.ink, fontSize: 46, lineHeight: 50, fontFamily: Font.display },
  subtitle: { color: Brand.muted, fontSize: 14, fontFamily: Font.body, marginTop: 4 },
  eyebrow: { color: Brand.eyebrow, fontSize: 10.5, letterSpacing: 2.3, fontFamily: Font.bold },
  muted: ui.muted,
  body: ui.body,
  strong: ui.strong,
  small: { color: Brand.muted, fontSize: 12.5, fontFamily: Font.body },
  card: {
    backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 16, overflow: "hidden",
    shadowColor: "#2B221B", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  goldLine: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  cardHeadLine: { borderBottomWidth: 1, borderBottomColor: Brand.lineSoft },
  cardTitle: { color: Brand.ink, fontSize: 23, lineHeight: 28, fontFamily: Font.displayRegular },
  cardBody: { padding: 20, gap: 10 },
  pressed: { opacity: 0.75 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Brand.white, borderColor: Brand.line,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  itemTitle: { color: Brand.ink, fontSize: 15, fontFamily: Font.body },
  empty: { alignItems: "center", gap: 10, padding: 28 },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FBF3E4", alignItems: "center", justifyContent: "center" },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 11.5, fontFamily: Font.bold },
  statCard: {
    flex: 1, minWidth: 150, gap: 6, backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 16, padding: 20,
    shadowColor: "#2B221B", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FBF3E4", alignItems: "center", justifyContent: "center" },
  stat: { fontSize: 34, lineHeight: 40, fontFamily: Font.display, marginTop: 6 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, minHeight: 42 },
  btnShadow: { shadowColor: "#6B4A10", shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  btnSmall: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, minHeight: 36 },
  btnGhost: { paddingHorizontal: 4, minHeight: 32 },
  btnText: { fontSize: 14, fontFamily: Font.bold },
  segmented: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: Brand.inputLine, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: Brand.ink, borderColor: Brand.ink },
  chipText: { color: Brand.body, fontSize: 13, fontFamily: Font.body },
  tabs: { borderBottomWidth: 1, borderBottomColor: "#EAE0D0", flexGrow: 0 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", marginBottom: -1 },
  tabOn: { borderBottomColor: Brand.gold },
  tabText: { color: Brand.muted, fontSize: 14, fontFamily: Font.body },
  fieldBox: { gap: 6, flexGrow: 1, flexShrink: 1, minWidth: 140 },
  label: ui.label,
  input: {
    backgroundColor: Brand.white, borderColor: Brand.inputLine, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44, color: Brand.ink, fontFamily: Font.body,
  },
  inputFocus: { borderColor: Brand.bronzeMid },
  inputText: { flex: 1, color: Brand.ink, fontSize: 15, fontFamily: Font.body },
  selectBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  hint: { color: Brand.muted, fontSize: 12, fontFamily: Font.body },
  error: { color: Brand.danger, fontSize: 13, fontFamily: Font.body },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft },
  toggle: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  backdrop: { flex: 1, backgroundColor: "rgba(41,32,26,0.35)" },
  sheet: { backgroundColor: "#FFFCFB", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, maxHeight: "90%" },
  drawer: { width: 540, maxWidth: "100%", backgroundColor: "#FFFCFB", paddingHorizontal: 24, shadowColor: "#29201A", shadowOpacity: 0.35, shadowRadius: 30, elevation: 12 },
  toast: { position: "absolute", left: 16, right: 16, alignItems: "center" },
  toastInner: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, maxWidth: 420, borderWidth: 1, borderColor: "rgba(232,200,130,0.35)" },
});
