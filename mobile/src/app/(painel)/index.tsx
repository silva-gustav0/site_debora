import { useStatus } from "@powersync/react-native";
import {
  addDays, brl, diffDays, fillTemplate, firstName, fmtDate, fmtWeekday, INTERACTION_LABEL, monthName, shiftMonth, todaySP, whatsappLink,
} from "@shared/format";
import { toTimestamp } from "@shared/hours";
import type { InteractionKind } from "@shared/types";
import { router } from "expo-router";
import {
  AlertTriangle, ArrowRight, Boxes, Cake, CalendarCheck, CalendarPlus, CircleDollarSign, Clock, Cloud, CloudOff, type LucideIcon,
  MessageCircle, Package, Receipt, Sparkles, UserPlus, Users,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, G, Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { Badge, Button, Card, Empty, Row, Screen, Stat, Txt, useToast, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { useMe, useSettings } from "@/db/hooks";
import { save, write } from "@/db/write";
import { ApptItem, between, PKG_SQL, type Pkg, useAppts, useRows } from "@/lib/agenda";
import { useSession } from "@/lib/session";

type Bill = { id: string; kind: string; amount: number; description: string | null; category: string; due_on: string };
type Task = { id: string; kind: InteractionKind; content: string; due_on: string; client_id: string; client_name: string | null };
type Named = { id: string; name: string; phone?: string | null; stock_qty?: number; unit?: string | null };
type Month = { label: string; income: number; expense: number };

const BRONZE = "#9A6F1E", EXPENSE = "#E3D3C4";
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Receitas x despesas por mês com linha de resultado (MonthlyChart do painel). */
function MonthlyChart({ months }: { months: Month[] }) {
  const W = 640, H = 220, L = 44, B = 26, T = 12;
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const innerW = W - L - 8, innerH = H - B - T, slot = innerW / months.length, bw = Math.min(16, slot / 3);
  const yv = (v: number) => T + innerH - (v / top) * innerH;
  const cx = (i: number) => L + slot * i + slot / 2;
  const key = (color: string, label: string, line?: boolean) => (
    <Row gap={6}><View style={line ? { width: 16, height: 2, backgroundColor: Brand.gold } : { width: 12, height: 12, borderRadius: 2, backgroundColor: color }} /><Text style={s.legend}>{label}</Text></Row>
  );
  return (
    <View style={{ gap: 8 }}>
      <Row gap={16}>{key(BRONZE, "Receitas")}{key(EXPENSE, "Despesas")}{key(Brand.gold, "Resultado", true)}</Row>
      <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", aspectRatio: W / H }}>
        {[0, top / 2, top].map((t) => (
          <G key={t}>
            <Line x1={L} x2={W - 8} y1={yv(t)} y2={yv(t)} stroke="#F0E7DA" />
            <SvgText x={L - 6} y={yv(t) + 4} textAnchor="end" fontSize="10" fill="#A69885" fontFamily={Font.body}>{compact.format(t)}</SvgText>
          </G>
        ))}
        {months.map((m, i) => (
          <G key={m.label}>
            <Rect x={cx(i) - bw - 1} y={yv(m.income)} width={bw} height={Math.max(innerH + T - yv(m.income), 0)} rx={3} fill={BRONZE} />
            <Rect x={cx(i) + 1} y={yv(m.expense)} width={bw} height={Math.max(innerH + T - yv(m.expense), 0)} rx={3} fill={EXPENSE} />
            <SvgText x={cx(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill={Brand.muted} fontFamily={Font.body}>{m.label}</SvgText>
          </G>
        ))}
        <Polyline points={months.map((m, i) => `${cx(i)},${yv(Math.max(m.income - m.expense, 0))}`).join(" ")} fill="none" stroke={Brand.gold} strokeWidth={2} strokeLinejoin="round" />
        {months.map((m, i) => <Circle key={m.label} cx={cx(i)} cy={yv(Math.max(m.income - m.expense, 0))} r={3.5} fill="#fff" stroke={Brand.gold} strokeWidth={2} />)}
      </Svg>
    </View>
  );
}

/** Link dourado do cabeçalho dos cartões ("Abrir agenda →"). */
const CardLink = ({ label, href, arrow }: { label: string; href: string; arrow?: boolean }) => (
  <Pressable onPress={() => router.push(href as never)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
    <Text style={s.link}>{label}</Text>{arrow && <ArrowRight size={12} color={Brand.bronze} />}
  </Pressable>
);

/** Alerta colorido da clínica (aniversário, conta, estoque, pacote). */
function AlertRow({ icon: I, bg, fg, children, right, onPress }: { icon: LucideIcon; bg: string; fg: string; children: ReactNode; right?: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.alert, { backgroundColor: bg }, pressed && { opacity: 0.8 }]}>
      <I size={16} color={fg} /><Text style={s.alertText}>{children}</Text>{right}
    </Pressable>
  );
}

/** Indicador tocável que leva à tela correspondente. */
const Tile = ({ href, ...p }: Parameters<typeof Stat>[0] & { href: string }) => (
  <Pressable onPress={() => router.push(href as never)} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.85 }]}><Stat {...p} /></Pressable>
);

/** Início: indicadores, agenda de hoje, receitas e despesas, alertas, tarefas e estado da sincronização. */
export default function Home() {
  const toast = useToast();
  const { session } = useSession();
  const me = useMe();
  const settings = useSettings();
  const sync = useStatus();
  const wide = useWide();
  const landscape = useWindowDimensions().width >= 1180; // cabe a fileira de 5 indicadores ao lado do menu completo
  const [hour] = useState(() => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date())));
  const today = todaySP();
  const ym = today.slice(0, 7);
  const prev = shiftMonth(ym, -1);
  const byMonth = useRows<{ m: string; kind: string; v: number }>(
    `select substr(occurred_on, 1, 7) as m, kind, sum(amount - case when kind = 'receita' then coalesce(fee, 0) else 0 end) as v
     from transactions where status = 'pago' and occurred_on between ? and ? group by 1, 2`,
    [`${shiftMonth(ym, -5)}-01`, today],
  );
  const sum = (m: string, kind: string) => Number(byMonth.find((b) => b.m === m && b.kind === kind)?.v ?? 0);
  const income = sum(ym, "receita");
  const lastSame = useRows<{ v: number }>(
    "select coalesce(sum(amount - coalesce(fee, 0)), 0) as v from transactions where kind = 'receita' and status = 'pago' and occurred_on between ? and ?",
    [`${prev}-01`, `${prev}-${today.slice(8)}`],
  )[0]?.v ?? 0;
  const trend = lastSame ? Math.round(((income - lastSame) / lastSame) * 100) : null;
  const months = Array.from({ length: 6 }, (_, i) => { const m = shiftMonth(ym, i - 5); return { label: monthName(m, "short"), income: sum(m, "receita"), expense: sum(m, "despesa") }; });
  const since = toTimestamp(`${ym}-01`, "00:00");
  const done = useRows<{ v: number; n: number }>("select coalesce(sum(price), 0) as v, count(*) as n from appointments where status = 'concluido' and datetime(starts_at) >= datetime(?)", [since])[0];
  const newClients = useRows<{ n: number }>("select count(*) as n from clients where datetime(created_at) >= datetime(?)", [since])[0]?.n ?? 0;
  const ticket = done?.n ? done.v / done.n : 0;
  const pending = useAppts("a.status = 'solicitado' and datetime(a.starts_at) >= datetime('now')", [], 8);
  const [inDay, ...dayParams] = between(today, today);
  const todayAppts = useAppts(inDay, dayParams);
  const bills = useRows<Bill>("select id, kind, amount, description, category, due_on from transactions where status = 'pendente' and due_on <= ? order by due_on limit 8", [addDays(today, 7)]);
  const lowStock = useRows<Named>("select id, name, stock_qty, unit from products where active = 1 and min_qty > 0 and stock_qty <= min_qty");
  const birthdays = useRows<Named>("select id, name, phone from clients where substr(birth_date, 6, 5) = ?", [today.slice(5)]);
  const pkgs = useRows<Pkg>(`${PKG_SQL} where cp.status = 'ativo'`).filter(
    (p) => (p.expires_on && diffDays(today, p.expires_on) <= 15) || p.sessions_total - p.used <= 1,
  );
  const tasks = useRows<Task>(
    `select i.id, i.kind, i.content, i.due_on, i.client_id, c.name as client_name from interactions i left join clients c on c.id = i.client_id
     where i.done_at is null and i.due_on is not null and i.due_on <= ? order by i.due_on limit 6`, [today],
  );
  const conflicts = useRows<{ id: string; message: string }>("select id, message from sync_conflicts order by datetime(created_at) desc limit 5");
  const queued = useRows<{ n: number }>("select count(*) as n from ps_crud")[0]?.n ?? 0;

  const active = todayAppts.filter((a) => a.status !== "cancelado");
  const alerts = lowStock.length + bills.length + pkgs.length + birthdays.length;
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const syncLabel = !sync.connected ? "Sem conexão: trabalhando offline"
    : sync.dataFlowStatus.downloading || sync.dataFlowStatus.uploading ? "Sincronizando…" : "Sincronizado";

  const stats = [
    <Tile key="f" href="/financeiro" dark icon={CircleDollarSign} label={`Faturamento · ${monthName(ym, "short")}`} value={brl(income)}
      hint={`${trend === null ? "" : `${trend >= 0 ? "▲" : "▼"} ${Math.abs(trend)}% · `}líquido, vs. mês passado`} />,
    <Tile key="h" href="/agenda" icon={CalendarCheck} label="Hoje" value={String(active.length)} hint={`${active.filter((a) => a.status === "concluido").length} concluídos`} />,
    <Tile key="c" href="/agenda" icon={Clock} label="A confirmar" value={String(pending.length)} hint="pedidos do site" />,
    <Tile key="t" href="/relatorios" icon={Receipt} label="Ticket médio" value={brl(ticket)} hint={`${done?.n ?? 0} atendimentos no mês`} />,
    <Tile key="n" href="/crm" icon={Users} label="Novos clientes" value={String(newClients)} hint="neste mês" />,
  ];

  const main = (
    <>
      {pending.length > 0 && (
        <Card title="Pedidos do site" eyebrow="Confirme pelo WhatsApp" gold right={<Badge tone="gold">{pending.length}</Badge>} bodyStyle={s.list}>
          {pending.map((a) => <ApptItem key={a.id} a={a} showDate />)}
        </Card>
      )}
      <Card title="Agenda de hoje" eyebrow={fmtDate(today, { year: undefined })} right={<CardLink label="Abrir agenda" href="/agenda" arrow />} bodyStyle={s.list}>
        {todayAppts.length ? todayAppts.map((a) => <ApptItem key={a.id} a={a} />) : <Empty icon={Sparkles} text="Agenda livre hoje." />}
      </Card>
      <Card title="Receitas e despesas" eyebrow="Últimos 6 meses" right={<CardLink label="Financeiro" href="/financeiro" />}>
        <MonthlyChart months={months} />
      </Card>
    </>
  );

  const side = (
    <>
      <Card title="Atenção" eyebrow="Alertas da clínica" right={alerts ? <Badge tone="red">{alerts}</Badge> : undefined} bodyStyle={s.list}>
        {!alerts && <Empty icon={Sparkles} text="Nada pedindo atenção agora." />}
        {birthdays.map((c) => {
          const wa = whatsappLink(c.phone, fillTemplate(settings.templates.aniversario, { nome: firstName(c.name), clinica: settings.clinic_name }));
          return (
            <AlertRow key={c.id} icon={Cake} bg="#F6EEF8" fg="#6B2E7A" onPress={() => router.push(`/clientes/${c.id}`)}
              right={wa && <Pressable onPress={() => Linking.openURL(wa)} hitSlop={8} accessibilityLabel="Parabenizar"><MessageCircle size={15} color="#6B2E7A" /></Pressable>}>
              Aniversário de <Text style={s.b}>{c.name}</Text>
            </AlertRow>
          );
        })}
        {bills.map((b) => (
          <AlertRow key={b.id} icon={Receipt} bg="#FFF6DD" fg="#7A5510" onPress={() => router.push("/financeiro")}
            right={<Text style={[s.alertSide, b.due_on < today ? { color: Brand.danger, fontFamily: Font.bold } : null]}>{b.due_on < today ? "vencida" : b.due_on === today ? "hoje" : fmtDate(b.due_on, { year: undefined })}</Text>}>
            {b.kind === "despesa" ? "Pagar" : "Receber"} <Text style={s.b}>{brl(b.amount)}</Text> · {b.description ?? b.category}
          </AlertRow>
        ))}
        {lowStock.map((p) => (
          <AlertRow key={p.id} icon={Boxes} bg="#FDECEC" fg={Brand.danger} onPress={() => router.push("/estoque")}
            right={<Text style={[s.alertSide, { color: Brand.danger }]}>{Number(p.stock_qty)} {p.unit ?? ""}</Text>}>
            Estoque baixo: <Text style={s.b}>{p.name}</Text>
          </AlertRow>
        ))}
        {pkgs.map((p) => (
          <AlertRow key={p.id} icon={Package} bg="#EEF1FB" fg="#34459A" onPress={() => router.push(`/clientes/${p.client_id}`)}>
            {p.name}: {p.sessions_total - p.used <= 1 ? `resta ${p.sessions_total - p.used} sessão` : `vence ${fmtDate(p.expires_on, { year: undefined })}`}
            {p.client_name ? ` · ${p.client_name}` : ""}
          </AlertRow>
        ))}
      </Card>

      <Card title="Tarefas de hoje" eyebrow="CRM" right={<CardLink label="Ver todas" href="/crm" />} bodyStyle={{ ...s.list, gap: 0 }}>
        {!tasks.length && <Empty icon={AlertTriangle} text="Nenhuma tarefa pendente." />}
        {tasks.map((t, i) => (
          <Row key={t.id} gap={12} style={i ? { ...s.task, ...s.divider } : s.task}>
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={8}>
                <Pressable onPress={() => router.push(`/clientes/${t.client_id}`)}><Text style={s.taskName}>{t.client_name ?? "Cliente"}</Text></Pressable>
                {t.due_on < today && <Badge tone="red">Atrasada</Badge>}
              </Row>
              <Text style={s.taskText} numberOfLines={2}><Text style={s.b}>{INTERACTION_LABEL[t.kind]}:</Text> {t.content}</Text>
            </View>
            <Button small variant="outline" onPress={() => save(toast, write((w) => w.update("interactions", t.id, { done_at: new Date().toISOString() })))}>Feito</Button>
          </Row>
        ))}
      </Card>
    </>
  );

  return (
    <Screen
      eyebrow={`${fmtWeekday(today, "long")} · ${fmtDate(today, { month: "long", year: undefined })}`}
      title={
        <Text style={[s.title, !wide && { fontSize: 38, lineHeight: 42 }]}>
          {greeting}{me ? ", " : ""}{me && <Text style={s.name}>{firstName(me.name)}</Text>}
        </Text>
      }
      subtitle={active.length
        ? `Você tem ${active.length} atendimento${active.length > 1 ? "s" : ""} hoje${pending.length ? ` e ${pending.length} pedido${pending.length > 1 ? "s" : ""} para confirmar` : ""}.`
        : "Nenhum atendimento hoje — bom momento para chamar clientes de volta."}
      right={
        <>
          <Button small variant="outline" icon={UserPlus} onPress={() => router.push("/clientes/nova")}>Nova cliente</Button>
          <Button icon={CalendarPlus} onPress={() => router.push("/agenda/novo")}>Agendar</Button>
        </>
      }
    >
      {landscape ? <Row gap={12} style={{ alignItems: "stretch" }}>{stats}</Row> : (
        <View style={{ gap: 12 }}>
          <Row style={{ alignItems: "stretch" }}>{stats[0]}</Row>
          <Row gap={12} style={{ alignItems: "stretch" }}>{stats.slice(1, 3)}</Row>
          <Row gap={12} style={{ alignItems: "stretch" }}>{stats.slice(3)}</Row>
        </View>
      )}

      {landscape ? (
        <Row gap={20} style={{ alignItems: "flex-start" }}>
          <View style={{ flex: 2, gap: 20 }}>{main}</View>
          <View style={{ flex: 1, gap: 20 }}>{side}</View>
        </Row>
      ) : <View style={{ gap: 20 }}>{main}{side}</View>}

      {conflicts.length > 0 && (
        <Card title="Alterações recusadas pelo servidor" eyebrow="Sincronização" right={<CardLink label="Ver" href="/conflitos" arrow />}>
          {conflicts.map((k) => <Txt.muted key={k.id}>• {k.message}</Txt.muted>)}
        </Card>
      )}
      <Row gap={10} style={s.sync}>
        {sync.connected ? <Cloud size={15} color={Brand.gold} /> : <CloudOff size={15} color={Brand.danger} />}
        <Text style={s.syncText}>
          <Text style={s.b}>{syncLabel}</Text>
          {` · ${settings.clinic_name} · ${session?.user.email ?? ""}`}
          {sync.lastSyncedAt ? ` · última sincronização ${sync.lastSyncedAt.toLocaleString("pt-BR")}` : ""}
          {queued ? ` · ${queued} alterações aguardando envio` : ""}
        </Text>
      </Row>
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { color: Brand.ink, fontSize: 46, lineHeight: 52, fontFamily: Font.display },
  name: { fontFamily: Font.displayItalic, color: Brand.bronze },
  legend: { fontFamily: Font.body, fontSize: 12, color: Brand.body },
  link: { fontFamily: Font.body, fontSize: 12.5, color: Brand.bronze },
  list: { padding: 12, gap: 8 },
  alert: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  alertText: { flex: 1, fontFamily: Font.body, fontSize: 14, color: Brand.ink },
  alertSide: { fontFamily: Font.body, fontSize: 12, color: "#7A5510" },
  b: { fontFamily: Font.bold },
  task: { paddingVertical: 10, paddingHorizontal: 4, alignItems: "flex-start" },
  divider: { borderTopWidth: 1, borderTopColor: Brand.lineSoft },
  taskName: { fontFamily: Font.body, fontSize: 14, color: Brand.ink },
  taskText: { fontFamily: Font.body, fontSize: 12.5, color: Brand.muted },
  sync: { borderRadius: 12, borderWidth: 1, borderColor: Brand.line, backgroundColor: "rgba(255,255,255,0.6)", paddingHorizontal: 14, paddingVertical: 10 },
  syncText: { flex: 1, fontFamily: Font.body, fontSize: 12, color: Brand.muted },
});
