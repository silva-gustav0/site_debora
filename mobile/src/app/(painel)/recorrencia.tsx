import { firstName, fillTemplate, fmtDate, whatsappLink } from "@shared/format";
import { RECURRENCE_META, type RecurrenceStatus } from "@shared/recurrence";
import { router } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";
import { Clock, Repeat, TimerReset, UserX } from "lucide-react-native";
import { Avatar, Badge, Button, Card, Empty, Row, Screen, Segmented, Stat, Txt, useToast } from "@/components/ui";
import { useServices, useSettings } from "@/db/hooks";
import { logContact, useClients } from "@/lib/reports";

const FILTERS: { key: RecurrenceStatus | "todas"; label: string }[] = [
  { key: "todas", label: "Precisam de atenção" }, { key: "atrasada", label: "Atrasados" }, { key: "proxima", label: "Próximos 7 dias" },
  { key: "inativa", label: "Inativos" }, { key: "agendada", label: "Já agendados" }, { key: "em_dia", label: "Em dia" },
];

/** Recorrência: quem deveria estar voltando, pela frequência real de cada cliente, com WhatsApp de retorno. */
export default function Recorrencia() {
  const toast = useToast();
  const settings = useSettings();
  const serviceName = new Map(useServices().map((s) => [s.id, s.name]));
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todas");
  const withVisits = useClients().filter((c) => c.recurrence.status !== "sem_visita");
  const recurring = withVisits.filter((c) => c.visits >= 2).length;
  const learned = withVisits.filter((c) => c.recurrence.learned);
  const count = (s: RecurrenceStatus) => withVisits.filter((c) => c.recurrence.status === s).length;
  const list = withVisits
    .filter((c) => (filter === "todas" ? ["atrasada", "proxima", "inativa"].includes(c.recurrence.status) : c.recurrence.status === filter))
    .sort((a, b) => RECURRENCE_META[a.recurrence.status].order - RECURRENCE_META[b.recurrence.status].order || (a.recurrence.daysUntilDue ?? 0) - (b.recurrence.daysUntilDue ?? 0));

  return (
    <Screen eyebrow="Relacionamento" title="Recorrência" subtitle="Quem deveria estar voltando, pela frequência real de cada cliente">
      <Row wrap>
        <Stat dark icon={Repeat} label="Taxa de retorno" value={withVisits.length ? `${Math.round((recurring / withVisits.length) * 100)}%` : "—"} hint={`${recurring} de ${withVisits.length} voltaram`} />
        <Stat icon={Clock} label="Frequência média" value={learned.length ? `${Math.round(learned.reduce((s, c) => s + c.recurrence.interval, 0) / learned.length)} dias` : "—"} hint="entre visitas" />
        <Stat icon={TimerReset} label="Retorno atrasado" value={String(count("atrasada"))} tone={count("atrasada") ? "red" : "bronze"} hint={`${count("proxima")} vencem em 7 dias`} />
        <Stat icon={UserX} label="Inativos" value={String(count("inativa"))} hint="reative com campanha" />
      </Row>
      <Segmented value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ value: f.key, label: f.label }))} />
      {list.length === 0 && <Card><Empty icon={Repeat} text="Nenhum cliente nesta lista." /></Card>}
      {list.map((c) => {
        const r = c.recurrence;
        const svc = c.last_service_id ? serviceName.get(c.last_service_id) : null;
        const msg = fillTemplate(settings.templates[r.status === "inativa" ? "reativacao" : "retorno"], { nome: firstName(c.name), servico: svc ?? "tratamento", clinica: settings.clinic_name });
        const wa = c.optIn ? whatsappLink(c.phone, msg) : null;
        return (
          <Card key={c.id} onPress={() => router.push(`/clientes/${c.id}`)} title={c.name} eyebrow={`${c.visits} visitas · ${svc ?? "sem serviço"}`}
            right={<Row><Avatar name={c.name} size={30} /><Badge tone={RECURRENCE_META[r.status].tone}>{RECURRENCE_META[r.status].label}</Badge></Row>}>
            <Txt.muted>Última visita {fmtDate(r.lastVisit)} (há {r.daysSinceLast} dias) · frequência {r.interval} dias ({r.learned ? "média real" : "sugerida"})</Txt.muted>
            <Txt.body style={r.daysUntilDue !== null && r.daysUntilDue < 0 && r.status !== "agendada" ? { color: "#9B2C2C" } : undefined}>
              {r.status === "agendada" ? `Agendado para ${fmtDate(c.next_appointment)}`
                : `Retorno previsto ${fmtDate(r.dueDate)} · ${r.daysUntilDue! < 0 ? `${-r.daysUntilDue!} dias de atraso` : r.daysUntilDue === 0 ? "hoje" : `em ${r.daysUntilDue} dias`}`}
            </Txt.body>
            <Row wrap>
              {wa ? <Button small icon="logo-whatsapp" onPress={() => Linking.openURL(wa)}>Chamar</Button> : <Txt.muted>Sem telefone ou não aceita mensagens</Txt.muted>}
              <Button small variant="ghost" onPress={async () => { await logContact(c.id, "Mensagem de retorno enviada pelo WhatsApp."); toast("Contato registrado."); }}>Contatada</Button>
              <Button small variant="outline" onPress={() => router.push({ pathname: "/agenda/novo", params: { client_id: c.id } })}>Agendar</Button>
            </Row>
          </Card>
        );
      })}
      <Txt.muted style={{ fontSize: 12 }}>A frequência usa o intervalo médio real entre as visitas concluídas. Com menos de duas visitas, usa o retorno sugerido do serviço (ajustável em Serviços).</Txt.muted>
    </Screen>
  );
}
