import type { LucideIcon } from "lucide-react-native";
import { Children, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import { Icon } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";

// Peças visuais do painel usadas nas telas de clientes (.p-table, grades xl:grid-cols, Progress, linha do tempo).

/** Tablet deitado (grades de duas/três colunas do painel). */
export const useLandscape = () => useWindowDimensions().width >= 1100;

/** Colunas lado a lado no tablet deitado (a primeira com `side` px ou a última com `aside` px) e empilhadas no resto. */
export function Cols({ children, side, aside, gap = 20 }: { children: ReactNode; side?: number; aside?: number; gap?: number }) {
  const wide = useLandscape();
  const items = Children.toArray(children).filter(Boolean);
  if (!wide) return <View style={{ gap }}>{items}</View>;
  const width = (i: number) => (i === 0 && side) || (i === items.length - 1 && aside) || undefined;
  return (
    <View style={{ flexDirection: "row", gap, alignItems: "flex-start" }}>
      {items.map((c, i) => <View key={i} style={width(i) ? { width: width(i), gap } : { flex: 1, minWidth: 0, gap }}>{c}</View>)}
    </View>
  );
}

/** Grade de indicadores: `cols` por linha no deitado, duas por linha no resto. */
export function StatGrid({ children, cols }: { children: ReactNode; cols: number }) {
  const n = useLandscape() ? cols : 2;
  const items = Children.toArray(children).filter(Boolean);
  const rows = Array.from({ length: Math.ceil(items.length / n) }, (_, r) => items.slice(r * n, r * n + n));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 12 }}>
          {Array.from({ length: n }, (_, i) => <View key={i} style={{ flex: 1, flexDirection: "row" }}>{row[i]}</View>)}
        </View>
      ))}
    </View>
  );
}

/** Barra de progresso fina (sessões do pacote). */
export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return <View style={s.track}><View style={[s.bar, { width: `${pct}%` }]} /></View>;
}

/** Link pequeno em bronze no canto do cartão ("Gerenciar", "Prontuário"). */
export const CardLink = ({ children, onPress }: { children: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={8}><Text style={s.link}>{children}</Text></Pressable>
);

/** Aviso colorido (.p-alert / faixa de atenção). */
export function Notice({ children, icon, tone = "gold" }: { children: ReactNode; icon?: LucideIcon; tone?: "gold" | "red" }) {
  const t = tone === "red" ? { bg: "#FDECEC", bd: "#F2C1C1", fg: "#7A1F1F" } : { bg: "#FFF6DD", bd: "#EED9A0", fg: "#7A5510" };
  return (
    <View style={[s.notice, { backgroundColor: t.bg, borderColor: t.bd }]}>
      {icon && <Icon icon={icon} size={16} color={t.fg} />}
      <Text style={[s.text, { color: t.fg, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Item da linha do tempo com bolinha dourada à esquerda. */
export function TimelineItem({ children, dot = "gold" }: { children: ReactNode; dot?: "gold" | "soft" }) {
  return (
    <View style={s.tlItem}>
      <View style={[s.dot, { backgroundColor: dot === "gold" ? Brand.gold : "#E6D8BC" }]} />
      {children}
    </View>
  );
}

/** Linha vertical da linha do tempo. */
export const Timeline = ({ children }: { children: ReactNode }) => <View style={s.timeline}>{children}</View>;

export type Column = { label: string; flex?: number; right?: boolean };
export type TableRow = { key: string; cells: ReactNode[]; onPress?: () => void };

/** Tabela do painel (.p-table): cabeçalho em versalete e linhas finas; rola de lado se não couber. */
export function Table({ columns, rows, minWidth = 0 }: { columns: Column[]; rows: TableRow[]; minWidth?: number }) {
  const cell = (c: Column, i: number, node: ReactNode, head?: boolean) => (
    <View key={i} style={[s.cell, { flex: c.flex ?? 1 }, c.right && { alignItems: "flex-end" }]}>
      {typeof node === "string" || typeof node === "number"
        ? <Text style={[head ? s.th : s.td, c.right && { textAlign: "right" }]}>{head ? String(node).toUpperCase() : node}</Text>
        : node}
    </View>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, minWidth }}>
        <View style={[s.tr, s.thead]}>{columns.map((c, i) => cell(c, i, c.label, true))}</View>
        {rows.map((r) => (
          <Pressable key={r.key} onPress={r.onPress} disabled={!r.onPress} style={({ pressed }) => [s.tr, pressed && { backgroundColor: "#FEFAF6" }]}>
            {columns.map((c, i) => cell(c, i, r.cells[i]))}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

/** Texto do corpo no padrão do painel (Lato 14). */
export const T = ({ children, style, lines }: { children: ReactNode; style?: ViewStyle | object; lines?: number }) => (
  <Text style={[s.text, style]} numberOfLines={lines}>{children}</Text>
);

export const cs = StyleSheet.create({
  small: { fontFamily: Font.body, fontSize: 12, color: Brand.muted },
  bold: { fontFamily: Font.bold, color: Brand.ink },
  display: { fontFamily: Font.displayRegular, fontSize: 21, color: Brand.ink },
  label: { fontFamily: Font.bold, fontSize: 10.5, letterSpacing: 1.2, color: "#9A8B78" },
  box: { borderWidth: 1, borderColor: "#F0E8DB", borderRadius: 12, backgroundColor: Brand.white },
});

const s = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: "#F4EDE1", overflow: "hidden" },
  bar: { height: 6, borderRadius: 3, backgroundColor: Brand.bronzeMid },
  link: { fontFamily: Font.body, fontSize: 12.5, color: Brand.bronze },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  text: { fontFamily: Font.body, fontSize: 14, color: Brand.ink },
  timeline: { borderLeftWidth: 2, borderLeftColor: "#F0E7DA", marginLeft: 8, gap: 22, paddingVertical: 2 },
  tlItem: { paddingLeft: 22, gap: 4 },
  dot: { position: "absolute", left: -9, top: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: Brand.white },
  tr: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F8F2E8", minHeight: 58 },
  thead: { backgroundColor: "#FEFBF7", borderBottomColor: "#F0E7DA", minHeight: 38 },
  cell: { paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  th: { fontFamily: Font.bold, fontSize: 10.5, letterSpacing: 1.1, color: "#9A8B78" },
  td: { fontFamily: Font.body, fontSize: 14, color: Brand.ink },
});
