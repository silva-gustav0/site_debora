import { brl } from "@shared/format";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";

// Gráficos e tabela no visual do painel web (components/painel/charts.tsx e .p-table).
const BRONZE = "#9A6F1E";
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const t = (size: number, color: string, bold?: boolean) => ({ fontSize: size, color, fontFamily: bold ? Font.bold : Font.body });

/** Barra de progresso fina (trilho bege e preenchimento colorido). */
export function Progress({ value, max, color = BRONZE }: { value: number; max: number; color?: string }) {
  return <View style={{ height: 8, borderRadius: 4, backgroundColor: Brand.lineSoft }}><View style={{ height: 8, borderRadius: 4, width: `${Math.min(Math.max((value / (max || 1)) * 100, 2), 100)}%`, backgroundColor: color }} /></View>;
}

/** Barras horizontais ordenadas, com rótulo, valor e percentual. */
export function BarList({ rows, empty = "Sem dados no período.", format = brl, color = BRONZE }: {
  rows: { label: string; value: number; hint?: string }[]; empty?: string; format?: (n: number) => string; color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!rows.length || max === 0) return <Text style={[t(14, Brand.muted), { textAlign: "center", paddingVertical: 24 }]}>{empty}</Text>;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <Text style={[t(14, Brand.ink), { flex: 1 }]} numberOfLines={1}>{r.label}{r.hint ? <Text style={t(12, Brand.muted)}>{` · ${r.hint}`}</Text> : null}</Text>
            <Text style={t(14, Brand.body)}>{format(r.value)} <Text style={t(12, "#A69885")}>{Math.round((r.value / total) * 100)}%</Text></Text>
          </View>
          <Progress value={r.value} max={max} color={color} />
        </View>
      ))}
    </View>
  );
}

/** Colunas por dia do mês, com o melhor dia em legenda. */
export function DailyBars({ days, highlight }: { days: { day: number; value: number }[]; highlight?: number }) {
  const max = Math.max(...days.map((d) => d.value), 0);
  const best = days.reduce((a, b) => (b.value > a.value ? b : a), days[0]);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 160, borderBottomWidth: 1, borderBottomColor: "#EAE0D0" }}>
        {days.map((d) => <View key={d.day} style={{ flex: 1, height: max ? `${(d.value / max) * 100}%` : 0, minHeight: d.value > 0 ? 3 : 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: d.day === highlight ? Brand.bronzeDark : BRONZE }} />)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={t(11, Brand.muted)}>1</Text>
        {best && best.value > 0 && <Text style={t(11, Brand.muted)}>Melhor dia: {best.day} ({brl(best.value)})</Text>}
        <Text style={t(11, Brand.muted)}>{days.length}</Text>
      </View>
    </View>
  );
}

/** Receitas x despesas por mês (barras bronze e bege) com a linha dourada de resultado. */
export function MonthlyChart({ months }: { months: { label: string; income: number; expense: number }[] }) {
  const W = 640, H = 220, L = 44, B = 26, T = 12;
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const innerW = W - L - 8, innerH = H - B - T, slot = innerW / months.length, bw = Math.min(16, slot / 3);
  const yv = (v: number) => T + innerH - (v / top) * innerH;
  const cx = (i: number) => L + slot * i + slot / 2;
  const legend = (c: string, line?: boolean) => <View style={{ width: line ? 16 : 12, height: line ? 2 : 12, borderRadius: 2, backgroundColor: c }} />;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        {([["Receitas", BRONZE], ["Despesas", "#E3D3C4"], ["Resultado", Brand.gold]] as const).map(([l, c]) => (
          <View key={l} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>{legend(c, l === "Resultado")}<Text style={t(12, Brand.body)}>{l}</Text></View>
        ))}
      </View>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", aspectRatio: W / H }}>
        {[0, top / 2, top].map((v) => (
          <G key={v}>
            <Line x1={L} x2={W - 8} y1={yv(v)} y2={yv(v)} stroke="#F0E7DA" strokeWidth={1} />
            <SvgText x={L - 6} y={yv(v) + 4} textAnchor="end" fontSize={10} fill="#A69885" fontFamily={Font.body}>{compact.format(v)}</SvgText>
          </G>
        ))}
        {months.map((m, i) => (
          <G key={i}>
            <Rect x={cx(i) - bw - 1} y={yv(m.income)} width={bw} height={Math.max(innerH + T - yv(m.income), 0)} rx={3} fill={BRONZE} />
            <Rect x={cx(i) + 1} y={yv(m.expense)} width={bw} height={Math.max(innerH + T - yv(m.expense), 0)} rx={3} fill="#E3D3C4" />
            <SvgText x={cx(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill={Brand.muted} fontFamily={Font.body}>{m.label}</SvgText>
          </G>
        ))}
        <Polyline points={months.map((m, i) => `${cx(i)},${yv(Math.max(m.income - m.expense, 0))}`).join(" ")} fill="none" stroke={Brand.gold} strokeWidth={2} strokeLinejoin="round" />
        {months.map((m, i) => <Circle key={i} cx={cx(i)} cy={yv(Math.max(m.income - m.expense, 0))} r={3.5} fill="#fff" stroke={Brand.gold} strokeWidth={2} />)}
      </Svg>
    </View>
  );
}

export type Col = { label: string; flex?: number; right?: boolean };
/** Tabela do painel (.p-table): cabeçalho em maiúsculas pequenas e linhas com divisória; texto puro vira célula padrão. */
export function DataTable({ cols, rows }: { cols: Col[]; rows: { key: string; cells: ReactNode[]; onPress?: () => void; dim?: boolean }[] }) {
  const cell = (c: Col, node: ReactNode, i: number) => (
    <View key={i} style={{ flex: c.flex ?? 1, alignItems: c.right ? "flex-end" : "flex-start", paddingRight: 8 }}>
      {typeof node === "string" || typeof node === "number" ? <Text style={t(14, Brand.ink)} numberOfLines={1}>{node}</Text> : node}
    </View>
  );
  return (
    <View>
      <View style={{ flexDirection: "row", backgroundColor: "#FEFBF7", borderBottomWidth: 1, borderBottomColor: "#F0E7DA", paddingHorizontal: 20, paddingVertical: 10 }}>
        {cols.map((c, i) => <View key={i} style={{ flex: c.flex ?? 1, alignItems: c.right ? "flex-end" : "flex-start", paddingRight: 8 }}><Text style={[t(10.5, "#9A8B78", true), { letterSpacing: 1.1 }]} numberOfLines={1}>{c.label.toUpperCase()}</Text></View>)}
      </View>
      {rows.map((r) => (
        <Pressable key={r.key} onPress={r.onPress} disabled={!r.onPress} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8F2E8", opacity: r.dim ? 0.5 : 1 }}>
          {cols.map((c, i) => cell(c, r.cells[i], i))}
        </Pressable>
      ))}
    </View>
  );
}

/** Duas colunas no tablet (proporção `ratio`:1, como o grid do painel) e empilhado no celular. */
export function Split({ left, right, ratio = 2 }: { left: ReactNode; right: ReactNode; ratio?: number }) {
  const wide = useWide();
  return wide
    ? <View style={{ flexDirection: "row", gap: 20, alignItems: "flex-start" }}><View style={{ flex: ratio, gap: 20 }}>{left}</View><View style={{ flex: 1, gap: 20 }}>{right}</View></View>
    : <View style={{ gap: 16 }}>{left}{right}</View>;
}
