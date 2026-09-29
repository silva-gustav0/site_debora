import { useQuery } from "@powersync/react-native";
import { fillTemplate, firstName, fmtDate, INTERACTION_LABEL, STAGE_LABEL, todaySP, whatsappLink } from "@shared/format";
import type { ClientStage, InteractionKind, TemplateKey } from "@shared/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Linking } from "react-native";
import { Avatar, Badge, Button, Card, Chip, ConfirmButton, Empty, Field, ListItem, Row, Screen, Segmented, Select, Stat, Txt, useToast } from "@/components/ui";
import { type Client, logContact, TEMPLATE_INFO, useClients } from "@/lib/reports";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";

const STAGES = Object.keys(STAGE_LABEL) as ClientStage[];
const SEGMENTS = {
  aniversariantes: { label: "Aniversariantes do mês", template: "aniversario" },
  retorno: { label: "Retorno vencendo", template: "retorno" },
  inativas: { label: "Inativos", template: "reativacao" },
  leads: { label: "Leads sem atendimento", template: "retorno" },
  vip: { label: "VIPs", template: "retorno" },
  todas: { label: "Todas (com permissão)", template: "retorno" },
} as const satisfies Record<string, { label: string; template: TemplateKey }>;
type Segment = keyof typeof SEGMENTS;

const inSegment = (seg: Segment, month: string) => (c: Client) =>
  seg === "aniversariantes" ? c.birth_date?.slice(5, 7) === month
  : seg === "retorno" ? ["atrasada", "proxima"].includes(c.recurrence.status)
  : seg === "inativas" ? c.recurrence.status === "inativa" || c.stage === "inativa"
  : seg === "leads" ? (c.stage === "lead" || c.stage === "em_contato") && !c.visits
  : seg === "vip" ? c.stage === "vip" : true;

type Task = { id: string; client_id: string; kind: InteractionKind; content: string; due_on: string; name: string; phone: string | null };
type Contact = { client_id: string; last: string; recent: number };

/** CRM: funil por estágio, tarefas de acompanhamento e campanhas segmentadas pelo WhatsApp. */
export default function Crm() {
  const toast = useToast();
  const settings = useSettings();
  const clients = useClients();
  const today = todaySP();
  const month = today.slice(5, 7);
  const [tab, setTab] = useState<"funil" | "tarefas" | "campanhas">("funil");
  const [segment, setSegment] = useState<Segment>("aniversariantes");
  const [tag, setTag] = useState("");
  const [modelo, setModelo] = useState<TemplateKey | "">("");
  const [custom, setCustom] = useState("");
  const { data: tasks } = useQuery<Task>(
    `select i.id, i.client_id, i.kind, i.content, i.due_on, c.name, c.phone from interactions i join clients c on c.id = i.client_id
     where i.done_at is null and i.due_on is not null order by i.due_on limit 100`,
  );
  const { data: contacts } = useQuery<Contact>(
    `select client_id, max(created_at) as last,
     max(case when kind = 'whatsapp' and julianday(created_at) > julianday('now', '-7 days') then 1 else 0 end) as recent from interactions group by client_id`,
  );
  const contact = useMemo(() => new Map(contacts.map((c) => [c.client_id, c])), [contacts]);

  const audienceBase = clients.filter((c) => c.optIn && c.phone);
  const audience = audienceBase.filter(tag ? (c) => c.tags.includes(tag) : inSegment(segment, month));
  const template = modelo || SEGMENTS[segment].template;
  const message = custom.trim().slice(0, 1000) || settings.templates[template];
  const tags = [...new Set(clients.flatMap((c) => c.tags))].sort();
  const label = tag ? `etiqueta ${tag}` : SEGMENTS[segment].label;
  const created = clients.filter((c) => c.created_at.startsWith(today.slice(0, 7)));
  const converted = created.filter((c) => c.visits > 0).length;
  const overdue = tasks.filter((t) => t.due_on < today).length;

  const send = (c: Client, text: string) => Linking.openURL(whatsappLink(c.phone, text) ?? "");
  const sendTo = (c: Client) => send(c, fillTemplate(message, { nome: firstName(c.name), clinica: settings.clinic_name, servico: "tratamento" }));
  const register = async (c: Client) => {
    await logContact(c.id, `Campanha (${label}): ${fillTemplate(message, { nome: firstName(c.name), clinica: settings.clinic_name, servico: "tratamento" }).slice(0, 300)}`);
    toast("Contato registrado.");
  };

  return (
    <Screen title="CRM e campanhas" subtitle="Funil, tarefas e mensagens pelo WhatsApp" back>
      <Row wrap>
        <Stat label="Novos contatos no mês" value={String(created.length)} />
        <Stat label="Conversão no mês" value={created.length ? `${Math.round((converted / created.length) * 100)}%` : "—"} hint={`${converted} já atendidas`} />
        <Stat label="Tarefas abertas" value={String(tasks.length)} tone={overdue ? "red" : "bronze"} hint={overdue ? `${overdue} atrasadas` : "em dia"} />
        <Stat label="Aniversariantes do mês" value={String(clients.filter(inSegment("aniversariantes", month)).length)} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: "funil", label: "Funil" }, { value: "tarefas", label: `Tarefas · ${tasks.length}` }, { value: "campanhas", label: "Campanhas" }]} />

      {tab === "funil" && STAGES.map((stage) => {
        const list = clients.filter((c) => c.stage === stage).sort((a, b) => (contact.get(b.id)?.last ?? b.created_at).localeCompare(contact.get(a.id)?.last ?? a.created_at));
        return (
          <Card key={stage} title={`${STAGE_LABEL[stage]} · ${list.length}`}>
            {list.length === 0 && <Txt.muted>Vazio</Txt.muted>}
            {list.slice(0, 30).map((c) => {
              const last = contact.get(c.id)?.last;
              return <ListItem key={c.id} left={<Avatar name={c.name} size={30} />} title={c.name} subtitle={`${c.visits} visitas · ${last ? `último contato ${fmtDate(last, { year: undefined })}` : `cadastro ${fmtDate(c.created_at, { year: undefined })}`}`} onPress={() => router.push(`/clientes/${c.id}`)} />;
            })}
            {list.length > 30 && <Txt.muted>e mais {list.length - 30}. Use a busca em Clientes.</Txt.muted>}
          </Card>
        );
      })}

      {tab === "tarefas" && (tasks.length === 0 ? <Empty icon="checkmark-circle-outline" text="Nenhuma tarefa aberta." /> : tasks.map((t) => (
        <Card key={t.id} title={t.name} eyebrow={INTERACTION_LABEL[t.kind]} onPress={() => router.push(`/clientes/${t.client_id}`)}
          right={<Badge tone={t.due_on < today ? "red" : t.due_on === today ? "gold" : "gray"}>{t.due_on === today ? "Hoje" : fmtDate(t.due_on, { year: undefined })}</Badge>}>
          <Txt.body>{t.content}</Txt.body>
          <Row wrap>
            <Button small icon="checkmark" onPress={() => write((w) => w.update("interactions", t.id, { done_at: new Date().toISOString() }))}>Feito</Button>
            {!!t.phone && <Button small variant="outline" icon="logo-whatsapp" onPress={() => Linking.openURL(whatsappLink(t.phone, `Oi, ${firstName(t.name)}! Aqui é da ${settings.clinic_name} 🌸`) ?? "")}>WhatsApp</Button>}
            <ConfirmButton onConfirm={() => write((w) => w.remove("interactions", t.id))} />
          </Row>
        </Card>
      )))}

      {tab === "campanhas" && (
        <>
          <Card title="Público" eyebrow="1. Escolha o segmento">
            <Row wrap>
              {(Object.keys(SEGMENTS) as Segment[]).map((s) => (
                <Chip key={s} on={!tag && s === segment} label={`${SEGMENTS[s].label} · ${audienceBase.filter(inSegment(s, month)).length}`} onPress={() => { setSegment(s); setTag(""); setModelo(""); }} />
              ))}
            </Row>
            {tags.length > 0 && <Txt.muted>Por etiqueta</Txt.muted>}
            <Row wrap>{tags.map((t) => <Chip key={t} label={t} on={tag === t} onPress={() => setTag(tag === t ? "" : t)} />)}</Row>
          </Card>
          <Card title="Mensagem" eyebrow="2. Personalize">
            <Select label="Modelo" value={template} onChange={setModelo} options={(Object.keys(TEMPLATE_INFO) as TemplateKey[]).map((k) => ({ value: k, label: TEMPLATE_INFO[k].title }))} />
            <Field label="Ou escreva uma mensagem própria" hint="Use {nome} para personalizar." multiline value={custom} onChangeText={setCustom} />
          </Card>
          <Card title={tag ? `Etiqueta: ${tag}` : SEGMENTS[segment].label} eyebrow={`3. Envie · ${audience.length} clientes · ${audience.filter((c) => contact.get(c.id)?.recent).length} contatadas nos últimos 7 dias`}>
            <Txt.muted>Toque em “Enviar” para abrir o WhatsApp com a mensagem pronta e depois em “Registrar” para marcar no histórico. Só aparecem clientes que aceitam mensagens (LGPD).</Txt.muted>
            {audience.length === 0 ? <Empty icon="paper-plane-outline" text="Ninguém neste segmento." /> : audience.map((c) => (
              <ListItem key={c.id} left={<Avatar name={c.name} size={30} />} title={c.name}
                subtitle={`${segment === "aniversariantes" && !tag && c.birth_date ? `dia ${c.birth_date.slice(8)}` : `${c.visits} visitas`}${contact.get(c.id)?.recent ? " · contatada nesta semana" : ""}`}
                right={<Row><Button small icon="paper-plane" onPress={() => sendTo(c)}>Enviar</Button><Button small variant="ghost" onPress={() => register(c)}>Registrar</Button></Row>} />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
