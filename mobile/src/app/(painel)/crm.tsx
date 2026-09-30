import { useQuery } from "@powersync/react-native";
import { niceFirstName } from "@shared/whatsapp-messages";
import { fillTemplate, firstName, fmtDate, INTERACTION_LABEL, STAGE_LABEL, todaySP, whatsappLink } from "@shared/format";
import type { ClientStage, InteractionKind, TemplateKey } from "@shared/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Linking, Text, View } from "react-native";
import { Cake, ClipboardCheck, TrendingUp, UserPlus } from "lucide-react-native";
import { Avatar, Badge, Button, Card, Chip, ConfirmButton, Empty, Field, ListItem, Row, Screen, Select, Stat, Tabs, Txt, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { type Client, logContact, TEMPLATE_INFO, useClients } from "@/lib/reports";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";

const COLUMNS: { stage: ClientStage; hint: string; color: string }[] = [
  { stage: "lead", hint: "Pediram informação ou agendaram pelo site", color: "#D4A73C" },
  { stage: "em_contato", hint: "Conversa em andamento / 1º horário", color: "#5B6FC9" },
  { stage: "cliente", hint: "Já foram atendidas", color: "#3F9A5E" },
  { stage: "vip", hint: "Frequentes ou de alto valor", color: "#8E4BA0" },
  { stage: "inativa", hint: "Pararam de vir", color: "#B8AFA2" },
];
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
  const wide = useWide();
  const settings = useSettings();
  const clients = useClients();
  const today = todaySP();
  const month = today.slice(5, 7);
  const [tab, setTab] = useState<"funil" | "tarefas" | "campanhas">("funil");
  const [segment, setSegment] = useState<Segment>("aniversariantes");
  const [tag, setTag] = useState("");
  const [modelo, setModelo] = useState<TemplateKey | "">("");
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState<Set<string>>(() => new Set()); // enviadas nesta sessão (envio em sequência)
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
  const textFor = (c: Client) => fillTemplate(message, { nome: niceFirstName(c.name), clinica: settings.clinic_name, servico: "tratamento" });
  // Abre o WhatsApp com a mensagem pronta e já registra no histórico (sem o passo "Registrar").
  const sendTo = async (c: Client) => {
    await send(c, textFor(c));
    setSent((s) => new Set(s).add(c.id));
    await logContact(c.id, `Campanha (${label}): ${textFor(c).slice(0, 300)}`);
  };
  const next = audience.find((c) => !sent.has(c.id));
  const done = audience.filter((c) => sent.has(c.id)).length;

  return (
    <Screen eyebrow="Relacionamento" title="CRM & Campanhas" subtitle="Funil de clientes, tarefas de acompanhamento e mensagens em massa pelo WhatsApp">
      <Row wrap>
        <Stat label="Novos contatos no mês" value={String(created.length)} icon={UserPlus} />
        <Stat label="Conversão no mês" value={created.length ? `${Math.round((converted / created.length) * 100)}%` : "—"} hint={`${converted} já atendidas`} icon={TrendingUp} />
        <Stat label="Tarefas abertas" value={String(tasks.length)} tone={overdue ? "red" : "bronze"} hint={overdue ? `${overdue} atrasadas` : "em dia"} icon={ClipboardCheck} />
        <Stat label="Aniversariantes do mês" value={String(clients.filter(inSegment("aniversariantes", month)).length)} icon={Cake} />
      </Row>
      <Tabs value={tab} onChange={setTab} options={[{ value: "funil", label: "Funil" }, { value: "tarefas", label: `Tarefas · ${tasks.length}` }, { value: "campanhas", label: "Campanhas" }]} />

      {tab === "funil" && (
        <View style={{ flexDirection: wide ? "row" : "column", gap: 14, alignItems: "flex-start" }}>
          {COLUMNS.map(({ stage, hint, color }) => {
            const list = clients.filter((c) => c.stage === stage).sort((a, b) => (contact.get(b.id)?.last ?? b.created_at).localeCompare(contact.get(a.id)?.last ?? a.created_at));
            return (
              <Card key={stage} style={{ flex: wide ? 1 : undefined, width: wide ? undefined : "100%", borderTopWidth: 3, borderTopColor: color, backgroundColor: "#FAF7F2" }} bodyStyle={{ padding: 10 }}
                title={<Text style={{ fontFamily: Font.displayRegular, fontSize: 21, color: Brand.ink }}>{STAGE_LABEL[stage]}  <Text style={{ fontFamily: Font.body, fontSize: 15, color: Brand.muted }}>{list.length}</Text></Text>}>
                <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }}>{hint}</Text>
                {list.length === 0 && <Text style={{ fontFamily: Font.body, fontSize: 13, color: Brand.placeholder, textAlign: "center", paddingVertical: 10 }}>Vazio</Text>}
                {list.slice(0, 30).map((c) => {
                  const last = contact.get(c.id)?.last;
                  return <ListItem key={c.id} left={<Avatar name={c.name} size={26} />} title={c.name} subtitle={`${c.visits} visitas · ${last ? `último contato ${fmtDate(last, { year: undefined })}` : `cadastro ${fmtDate(c.created_at, { year: undefined })}`}`} onPress={() => router.push(`/clientes/${c.id}`)} />;
                })}
                {list.length > 30 && <Txt.muted>e mais {list.length - 30}. Use a busca em Clientes.</Txt.muted>}
              </Card>
            );
          })}
        </View>
      )}

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
            <Txt.muted>O WhatsApp não permite envio automático para várias pessoas de um número comum, então o app faz em sequência: toque no botão, envie no WhatsApp e volte; a próxima já fica pronta. Cada envio é registrado no histórico. Só aparecem clientes que aceitam mensagens (LGPD).</Txt.muted>
            {audience.length > 0 && (next ? (
              <Button variant="gold" icon="logo-whatsapp" onPress={() => sendTo(next)}>
                {`Enviar para ${niceFirstName(next.name)} (${done + 1} de ${audience.length})`}
              </Button>
            ) : <Badge tone="green">Todas as {audience.length} mensagens deste público foram abertas.</Badge>)}
            {audience.length === 0 ? <Empty icon="paper-plane-outline" text="Ninguém neste segmento." /> : audience.map((c) => (
              <ListItem key={c.id} left={<Avatar name={c.name} size={30} />} title={c.name}
                subtitle={`${segment === "aniversariantes" && !tag && c.birth_date ? `dia ${c.birth_date.slice(8)}` : `${c.visits} visitas`}${contact.get(c.id)?.recent ? " · contatada nesta semana" : ""}`}
                right={sent.has(c.id) ? <Badge tone="green">Enviada</Badge> : <Button small variant="outline" icon="paper-plane" onPress={() => sendTo(c)}>Enviar</Button>} />
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
