import { useStatus } from "@powersync/react-native";
import {
  addDays, brl, diffDays, fillTemplate, firstName, fmtDate, fmtWeekday, INTERACTION_LABEL, monthName, todaySP, whatsappLink,
} from "@shared/format";
import type { InteractionKind } from "@shared/types";
import { router } from "expo-router";
import { Linking } from "react-native";
import { Badge, Button, Card, Empty, ListItem, Row, Screen, Section, Stat, Txt } from "@/components/ui";
import { useMe, useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { ApptItem, between, PKG_SQL, type Pkg, useAppts, useRows } from "@/lib/agenda";
import { useSession } from "@/lib/session";

type Bill = { id: string; kind: string; amount: number; description: string | null; category: string; due_on: string };
type Task = { id: string; kind: InteractionKind; content: string; due_on: string; client_id: string; client_name: string | null };
type Named = { id: string; name: string; phone?: string | null; stock_qty?: number; unit?: string | null };

/** Início: faturamento, pedidos, agenda do dia, alertas, tarefas e estado da sincronização. */
export default function Home() {
  const { session } = useSession();
  const me = useMe();
  const settings = useSettings();
  const sync = useStatus();
  const today = todaySP();
  const ym = today.slice(0, 7);
  const income = useRows<{ v: number }>(
    "select coalesce(sum(amount - coalesce(fee, 0)), 0) as v from transactions where kind = 'receita' and status = 'pago' and occurred_on between ? and ?",
    [`${ym}-01`, today],
  )[0]?.v ?? 0;
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
  const conflicts = useRows<{ id: string; message: string }>("select id, message from sync_conflicts order by created_at desc limit 5");
  const counts = useRows<{ pending: number }>("select count(*) as pending from ps_crud")[0];

  const active = todayAppts.filter((a) => a.status !== "cancelado");
  const alerts = lowStock.length + bills.length + pkgs.length + birthdays.length;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const syncLabel = !sync.connected ? "Sem conexão: trabalhando offline"
    : sync.dataFlowStatus.downloading || sync.dataFlowStatus.uploading ? "Sincronizando…" : "Sincronizado";
  const alertRow = (key: string, title: string, subtitle: string | undefined, tone: "gold" | "red" | "blue" | "plum", label: string, go: () => void) => (
    <ListItem key={key} title={title} subtitle={subtitle} left={<Badge tone={tone}>{label}</Badge>} onPress={go} />
  );

  return (
    <Screen
      title={`${greeting}${me ? `, ${firstName(me.name)}` : ""}`}
      subtitle={`${fmtWeekday(today, "long")} · ${fmtDate(today, { month: "long", year: undefined })} · ${
        active.length ? `${active.length} atendimento${active.length > 1 ? "s" : ""} hoje${pending.length ? ` e ${pending.length} pedido${pending.length > 1 ? "s" : ""} para confirmar` : ""}`
          : "Nenhum atendimento hoje — bom momento para chamar clientes de volta."}`}
    >
      <Row wrap>
        <Button small variant="outline" icon="person-add-outline" onPress={() => router.push("/clientes/nova")}>Nova cliente</Button>
        <Button small icon="calendar-outline" onPress={() => router.push("/agenda/novo")}>Agendar</Button>
      </Row>

      <Card title={syncLabel} eyebrow={settings.clinic_name}>
        <Txt.muted>
          {session?.user.email}
          {sync.lastSyncedAt ? ` · última sincronização ${sync.lastSyncedAt.toLocaleString("pt-BR")}` : ""}
          {counts?.pending ? ` · ${counts.pending} alterações aguardando envio` : ""}
        </Txt.muted>
      </Card>

      {conflicts.length > 0 && (
        <Card title="Alterações recusadas pelo servidor" right={<Button small variant="ghost" onPress={() => router.push("/conflitos")}>Ver</Button>}>
          {conflicts.map((k) => <Txt.muted key={k.id}>• {k.message}</Txt.muted>)}
        </Card>
      )}

      <Row wrap>
        <Stat label={`Faturamento · ${monthName(ym, "short")}`} value={brl(income)} hint="líquido" />
        <Stat label="Hoje" value={String(active.length)} hint={`${active.filter((a) => a.status === "concluido").length} concluídos`} tone="blue" />
        <Stat label="A confirmar" value={String(pending.length)} hint="pedidos do site" tone={pending.length ? "gold" : "gray"} />
      </Row>

      {pending.length > 0 && (
        <Section title="Pedidos do site" right={<Badge tone="gold">{pending.length}</Badge>}>
          {pending.map((a) => <ApptItem key={a.id} a={a} showDate />)}
        </Section>
      )}

      <Section title="Agenda de hoje" right={<Button small variant="ghost" onPress={() => router.push("/agenda")}>Abrir agenda</Button>}>
        {todayAppts.length ? todayAppts.map((a) => <ApptItem key={a.id} a={a} />) : <Empty icon="sparkles-outline" text="Agenda livre hoje." />}
      </Section>

      <Section title="Atenção" right={alerts ? <Badge tone="red">{alerts}</Badge> : undefined}>
        {!alerts && <Empty icon="sparkles-outline" text="Nada pedindo atenção agora." />}
        {birthdays.map((c) => alertRow(c.id, `Aniversário de ${c.name}`, undefined, "plum", "Parabéns", () => {
          const wa = whatsappLink(c.phone, fillTemplate(settings.templates.aniversario, { nome: firstName(c.name), clinica: settings.clinic_name }));
          return wa ? Linking.openURL(wa) : router.push(`/clientes/${c.id}`);
        }))}
        {bills.map((b) => alertRow(b.id, `${b.kind === "despesa" ? "Pagar" : "Receber"} ${brl(b.amount)} · ${b.description ?? b.category}`,
          b.due_on < today ? "vencida" : b.due_on === today ? "hoje" : fmtDate(b.due_on, { year: undefined }), b.due_on < today ? "red" : "gold", "Conta",
          () => router.push("/financeiro")))}
        {lowStock.map((p) => alertRow(p.id, `Estoque baixo: ${p.name}`, `${Number(p.stock_qty)} ${p.unit ?? ""}`, "red", "Estoque", () => router.push("/estoque")))}
        {pkgs.map((p) => alertRow(p.id, `${p.name}: ${p.sessions_total - p.used <= 1 ? `resta ${p.sessions_total - p.used} sessão` : `vence ${fmtDate(p.expires_on, { year: undefined })}`}`,
          p.client_name ?? undefined, "blue", "Pacote", () => router.push(`/clientes/${p.client_id}`)))}
      </Section>

      <Section title="Tarefas de hoje" right={<Button small variant="ghost" onPress={() => router.push("/crm")}>Ver todas</Button>}>
        {!tasks.length && <Empty icon="checkmark-done-outline" text="Nenhuma tarefa pendente." />}
        {tasks.map((t) => (
          <ListItem
            key={t.id} title={t.client_name ?? "Cliente"} subtitle={`${INTERACTION_LABEL[t.kind]}: ${t.content}`}
            left={t.due_on < today ? <Badge tone="red">Atrasada</Badge> : undefined}
            right={<Button small variant="ghost" icon="checkmark" onPress={() => write((w) => w.update("interactions", t.id, { done_at: new Date().toISOString() }))}>Feito</Button>}
          />
        ))}
      </Section>
    </Screen>
  );
}
