import { useQuery } from "@powersync/react-native";
import { brl, fmtDate, fmtTime, STATUS_LABEL } from "@shared/format";
import { RECURRENCE_META } from "@shared/recurrence";
import { router } from "expo-router";
import { NotebookPen, Package } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Badge, Card, Empty, Stat } from "@/components/ui";
import { CardLink, Cols, cs, Notice, Progress, StatGrid, T } from "@/components/client-ui";
import { type Appt, APPTS, type CPkg, PKGS_SQL, STATUS_TONE, type TabProps } from "@/lib/clients";
import { useClients } from "@/lib/reports";
import { Font } from "@/constants/brand";

type Rec = { record_date: string; procedure: string; observations: string | null; parameters: string | null; next_steps: string | null };

/** Resumo: indicadores de visitas/retorno e cartões de próximos horários, pacotes ativos e última evolução. */
export function Resumo({ c, go }: TabProps) {
  const row = useClients().find((x) => x.id === c.id);
  const { data: next } = useQuery<Appt>(`${APPTS} and a.status in ('solicitado','confirmado') and datetime(a.ends_at) > datetime('now') order by a.starts_at`, [c.id]);
  const { data: st } = useQuery<{ spent: number; pending: number; n: number }>(
    `select (select coalesce(sum(amount), 0) from transactions where client_id = ?1 and kind = 'receita' and status = 'pago') spent,
     (select coalesce(sum(amount), 0) from transactions where client_id = ?1 and kind = 'receita' and status = 'pendente') pending,
     (select count(*) from transactions where client_id = ?1 and kind = 'receita' and status = 'pendente') n`, [c.id]);
  const { data: pkgs } = useQuery<CPkg>(PKGS_SQL, [c.id]);
  const { data: rec } = useQuery<Rec>("select * from session_records where client_id = ? order by record_date desc, created_at desc limit 1", [c.id]);
  const visits = Number(row?.visits ?? 0);
  const spent = Number(st[0]?.spent ?? 0);
  const r = row?.recurrence;
  const noShows = Number(row?.no_shows ?? 0);
  const nextReturn = row?.next_appointment ?? r?.dueDate;
  const active = pkgs.filter((p) => p.status === "ativo");
  const last = rec[0];
  return (
    <>
      <StatGrid cols={5}>
        <Stat label="Visitas" value={String(visits)} hint={noShows ? `${noShows} faltas` : "nenhuma falta"} />
        <Stat label="Total investido" value={brl(spent)} hint={visits ? `ticket ${brl(spent / visits)}` : undefined} />
        <Stat label="Última visita" value={r?.lastVisit ? fmtDate(r.lastVisit, { year: "2-digit" }) : "—"} hint={r?.daysSinceLast != null ? `há ${r.daysSinceLast} dias` : undefined} />
        <Stat label="Frequência" value={`${r?.interval ?? 30}d`} hint={r?.learned ? "média real" : "sugerida pelo serviço"} />
        <Stat label="Próximo retorno" value={nextReturn ? fmtDate(nextReturn, { year: "2-digit" }) : "—"} tone={r?.status === "atrasada" ? "red" : "bronze"}
          hint={r ? RECURRENCE_META[r.status].label : undefined} />
      </StatGrid>
      <Cols>
        <Card title="Próximos horários" bodyStyle={{ padding: 12, gap: 8 }} style={{ minHeight: 238 }}>
          {next.length === 0 ? <Empty text="Sem horários marcados." /> : next.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/agendamento/${a.id}`)} style={({ pressed }) => [cs.box, { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8 }, pressed && { backgroundColor: "#FDFAF5" }]}>
              <T style={{ flex: 1 }}><Text style={cs.bold}>{fmtDate(a.starts_at, { year: undefined })} {fmtTime(a.starts_at)}</Text> · {a.service ?? "—"}</T>
              <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
            </Pressable>
          ))}
        </Card>
        <Card title="Pacotes ativos" right={<CardLink onPress={() => go("pacotes")}>Gerenciar</CardLink>} style={{ minHeight: 238 }} bodyStyle={{ gap: 16 }}>
          {active.length === 0 ? <Empty icon={Package} text="Nenhum pacote ativo." /> : active.map((p) => (
            <View key={p.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T>{p.name}</T><T style={cs.small}>{p.used}/{p.sessions_total}</T></View>
              <Progress value={Number(p.used)} max={p.sessions_total} />
              {!!p.expires_on && <Text style={[cs.small, { fontSize: 11 }]}>Válido até {fmtDate(p.expires_on)}</Text>}
            </View>
          ))}
          {!!st[0]?.n && <Notice>Há {st[0].n} parcela(s) a receber: {brl(st[0].pending)}.</Notice>}
        </Card>
        <Card title="Última evolução" right={<CardLink onPress={() => go("evolucao")}>Prontuário</CardLink>} style={{ minHeight: 238 }}>
          {last ? (
            <View style={{ gap: 4 }}>
              <Text style={cs.small}>{fmtDate(last.record_date)} · {last.procedure}</Text>
              <T lines={6}>{last.observations ?? last.parameters ?? "—"}</T>
              {!!last.next_steps && <T style={[cs.small, { color: "#6B5A4B", marginTop: 6 }]}><Text style={{ fontFamily: Font.bold }}>Próximos passos:</Text> {last.next_steps}</T>}
            </View>
          ) : <Empty icon={NotebookPen} text="Nenhuma evolução registrada." />}
        </Card>
      </Cols>
    </>
  );
}
