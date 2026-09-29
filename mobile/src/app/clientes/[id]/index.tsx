import { useQuery, useStatus } from "@powersync/react-native";
import { consentOrDefault, fillConsent, formatAnswer, formOrDefault } from "@shared/anamnesis-schema";
import {
  brl, diffDays, fillTemplate, firstName, fmtDate, fmtTime, formatPhone, INTERACTION_LABEL, METHOD_LABEL, SOURCE_LABEL, STAGE_LABEL,
  STATUS_LABEL, todaySP, whatsappLink,
} from "@shared/format";
import type { AppointmentStatus, ClientSource, InteractionKind, PaymentMethod } from "@shared/types";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { Linking, View } from "react-native";
import {
  Badge, Button, Card, Chip, ConfirmButton, DateField, Empty, Field, ListItem, MoneyField, parseMoney, Row, Screen, Section,
  Segmented, Select, Stat, TONES, type Tone, Txt, useToast,
} from "@/components/ui";
import { asJson, asList, useMe, useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { clean, type ClientDb, nowIso, sellPackage, toOptions, useClient, useForm } from "@/lib/clients";
import { deletePhoto, discardQueued, pickPhotos, syncPhotos, useSignedUrls } from "@/lib/photo-sync";

type Appt = { id: string; starts_at: string; status: AppointmentStatus; price: number; service: string | null; client_package_id: string | null };
type Tab = "resumo" | "anamnese" | "evolucao" | "fotos" | "pacotes" | "historico" | "crm";
type P = { c: ClientDb };

const TABS: { value: Tab; label: string }[] = [
  { value: "resumo", label: "Resumo" }, { value: "anamnese", label: "Anamnese" }, { value: "evolucao", label: "Evolução" },
  { value: "fotos", label: "Fotos" }, { value: "pacotes", label: "Pacotes" }, { value: "historico", label: "Histórico" },
  { value: "crm", label: "Relacionamento" },
];
const STATUS_TONE: Record<AppointmentStatus, Tone> = { solicitado: "gold", confirmado: "blue", concluido: "green", cancelado: "gray", faltou: "red" };
const PKG_STATUS = { ativo: "Ativo", concluido: "Concluído", expirado: "Expirado", cancelado: "Cancelado" };
const KINDS = { nota: "Nota", whatsapp: "WhatsApp", ligacao: "Ligação", followup: "Tarefa" };
const PHOTO_KINDS = { antes: "Antes", depois: "Depois", evolucao: "Evolução" };
const APPTS = "select a.id, a.starts_at, a.status, a.price, a.client_package_id, s.name service from appointments a left join services s on s.id = a.service_id where a.client_id = ?";

/** Abre o WhatsApp da cliente com a mensagem. */
const openWa = (phone: string | null, text: string) => { const url = whatsappLink(phone, text); if (url) Linking.openURL(url); };

/** Linha de agendamento que abre o detalhe. */
function ApptItem({ a }: { a: Appt }) {
  return (
    <ListItem
      title={`${fmtDate(a.starts_at, { year: "2-digit" })} ${fmtTime(a.starts_at)} · ${a.service ?? "—"}`}
      subtitle={`${brl(a.price)}${a.client_package_id ? " · pacote" : ""}`}
      right={<Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>} onPress={() => router.push(`/agendamento/${a.id}`)}
    />
  );
}

/** Ficha completa da cliente, com abas como no painel. */
export default function FichaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  const [tab, setTab] = useState<Tab>("resumo");
  if (!c) return <Screen title="Cliente" back><Empty text="Cliente não encontrada." /></Screen>;
  const age = c.birth_date ? Math.floor(diffDays(c.birth_date, todaySP()) / 365.25) : null;
  const alerts = [c.health_notes, c.allergies && `Alergias: ${c.allergies}`].filter(Boolean).join(" · ");
  const Body = { resumo: Resumo, anamnese: Anamnese, evolucao: Evolucao, fotos: Fotos, pacotes: Pacotes, historico: Historico, crm: Crm }[tab];
  return (
    <Screen
      title={c.name} back subtitle={[formatPhone(c.phone), c.email, age !== null && `${age} anos`].filter(Boolean).join(" · ")}
      right={<Button small variant="outline" icon="create-outline" onPress={() => router.push(`/clientes/${id}/editar`)}>Editar</Button>}
    >
      <Row wrap gap={6}>
        <Badge tone="bronze">{STAGE_LABEL[c.stage as keyof typeof STAGE_LABEL] ?? c.stage}</Badge>
        {c.consent_signed_at ? <Badge tone="green">Termo assinado</Badge> : <Badge tone="gold">Termo pendente</Badge>}
        <Txt.muted>Via {SOURCE_LABEL[c.source as ClientSource] ?? c.source} · desde {fmtDate(c.created_at, { month: "short" })}</Txt.muted>
      </Row>
      {asList(c.tags).length > 0 && <Row wrap gap={6}>{asList(c.tags).map((t) => <Badge key={t}>{t}</Badge>)}</Row>}
      {!!alerts && (
        <Card style={{ backgroundColor: TONES.red.bg, borderColor: TONES.red.bd }}>
          <Txt.body style={{ color: TONES.red.fg }}>Atenção: {alerts}</Txt.body>
        </Card>
      )}
      <Segmented value={tab} options={TABS} onChange={setTab} />
      <Body c={c} />
    </Screen>
  );
}

/** Resumo: números, etapa, contato, próximos horários, pacotes ativos e última evolução. */
function Resumo({ c }: P) {
  const settings = useSettings();
  const { data: next } = useQuery<Appt>(`${APPTS} and a.status in ('solicitado','confirmado') and datetime(a.ends_at) > datetime('now') order by a.starts_at`, [c.id]);
  const { data: st } = useQuery<{ visits: number; spent: number; pending: number }>(
    `select (select count(*) from appointments where client_id = ?1 and status = 'concluido') visits,
     (select coalesce(sum(amount), 0) from transactions where client_id = ?1 and kind = 'receita' and status = 'pago') spent,
     (select coalesce(sum(amount), 0) from transactions where client_id = ?1 and kind = 'receita' and status = 'pendente') pending`, [c.id]);
  const { data: rec } = useQuery<{ record_date: string; procedure: string; observations: string | null; next_steps: string | null }>(
    "select * from session_records where client_id = ? order by record_date desc, created_at desc limit 1", [c.id]);
  const s = st[0];
  return (
    <>
      <Row wrap gap={10}>
        <Stat label="Visitas" value={String(s?.visits ?? 0)} />
        <Stat label="Total investido" value={brl(s?.spent)} hint={s?.visits ? `ticket ${brl(s.spent / s.visits)}` : undefined} />
        {!!s?.pending && <Stat label="A receber" value={brl(s.pending)} tone="gold" />}
      </Row>
      <Section title="Etapa no funil">
        <Segmented value={c.stage} options={toOptions(STAGE_LABEL)} onChange={(stage) => write((w) => w.update("clients", c.id, { stage }))} />
      </Section>
      <Row wrap>
        {!!c.phone && <Button variant="outline" icon="logo-whatsapp" onPress={() => openWa(c.phone, `Oi, ${firstName(c.name)}! Aqui é da ${settings.clinic_name} 🌸`)}>WhatsApp</Button>}
        <Button icon="calendar-outline" onPress={() => router.push(`/agenda/novo?client_id=${c.id}`)}>Novo agendamento</Button>
      </Row>
      <Section title="Próximos horários">
        {next.length ? next.map((a) => <ApptItem key={a.id} a={a} />) : <Empty text="Sem horários marcados." />}
      </Section>
      <Section title="Última evolução">
        {rec[0] ? (
          <Card eyebrow={`${fmtDate(rec[0].record_date)} · ${rec[0].procedure}`}>
            <Txt.body>{rec[0].observations ?? "—"}</Txt.body>
            {!!rec[0].next_steps && <Txt.muted>Próximos passos: {rec[0].next_steps}</Txt.muted>}
          </Card>
        ) : <Empty icon="clipboard-outline" text="Nenhuma evolução registrada." />}
      </Section>
    </>
  );
}

/** Respostas da anamnese e termo de consentimento (marcar/desmarcar assinado). */
function Anamnese({ c }: P) {
  const settings = useSettings();
  const a = asJson<Record<string, unknown>>(c.anamnesis, {});
  const filledAt = typeof a.filled_at === "string" ? a.filled_at : null;
  const consent = fillConsent(consentOrDefault(settings.consent_text), { clinica: settings.clinic_name, nome: c.name });
  const toggleConsent = () => write((w) => w.update("clients", c.id, { consent_signed_at: c.consent_signed_at ? null : nowIso() }));
  return (
    <>
      <Card
        title="Ficha de anamnese"
        eyebrow={filledAt ? `Preenchida pel${a.filled_by === "cliente" ? "o cliente (link)" : "a equipe"} em ${fmtDate(filledAt)} ${fmtTime(filledAt)}` : "Avaliação"}
        right={<Button small icon="create-outline" onPress={() => router.push(`/clientes/${c.id}/anamnese`)}>{filledAt ? "Editar" : "Preencher"}</Button>}
      >
        {formOrDefault(settings.anamnesis_form).sections.map((s) => (
          <View key={s.id} style={{ gap: 4, marginTop: 6 }}>
            <Txt.strong>{s.title}</Txt.strong>
            {s.questions.map((q) => <Txt.body key={q.id}><Txt.muted>{q.label}: </Txt.muted>{formatAnswer(q, a[q.id]) || "—"}</Txt.body>)}
          </View>
        ))}
      </Card>
      <Card title="Termo de consentimento" eyebrow={c.consent_signed_at ? `Assinado em ${fmtDate(c.consent_signed_at)}` : "Pendente"}>
        {consent.split(/\n\s*\n/).map((p, i) => <Txt.body key={i}>{p}</Txt.body>)}
        <Button variant={c.consent_signed_at ? "outline" : "primary"} icon={c.consent_signed_at ? "close" : "checkmark"} onPress={toggleConsent}>
          {c.consent_signed_at ? "Desmarcar" : "Marcar como assinado"}
        </Button>
      </Card>
    </>
  );
}

type Rec = { id: string; record_date: string; procedure: string; products_used: string | null; parameters: string | null; observations: string | null; next_steps: string | null };

/** Prontuário: nova evolução e linha do tempo do tratamento. */
function Evolucao({ c }: P) {
  const toast = useToast();
  const me = useMe();
  const { f, set, reset } = useForm({ record_date: todaySP() as string | null, appointment_id: "", procedure: "", products_used: "", parameters: "", observations: "", next_steps: "" });
  const { data: done } = useQuery<Appt>(`${APPTS} and a.status = 'concluido' order by a.starts_at desc limit 20`, [c.id]);
  const { data: services } = useQuery<{ name: string }>("select name from services where active = 1 order by sort_order, name");
  const { data: recs } = useQuery<Rec>("select * from session_records where client_id = ? order by record_date desc, created_at desc", [c.id]);
  const add = async () => {
    if (!f.procedure.trim()) return toast("Informe o procedimento realizado.", "error");
    await write((w) => w.insert("session_records", clean({ ...f, record_date: f.record_date ?? todaySP(), client_id: c.id, created_by: me?.id, created_at: nowIso() })));
    reset();
    toast("Evolução registrada no prontuário.");
  };
  const detail = (label: string, v: string | null) => !!v && <Txt.body><Txt.muted>{label}: </Txt.muted>{v}</Txt.body>;
  return (
    <>
      <Card title="Nova evolução" eyebrow="Prontuário">
        <Row wrap gap={12}>
          <DateField label="Data" value={f.record_date} onChange={set("record_date")} />
          <Select label="Atendimento" value={f.appointment_id} onChange={set("appointment_id")}
            options={[{ value: "", label: "—" }, ...done.map((a) => ({ value: a.id, label: `${fmtDate(a.starts_at, { year: "2-digit" })} · ${a.service ?? "—"}` }))]} />
        </Row>
        <Field label="Procedimento *" value={f.procedure} onChangeText={set("procedure")} />
        <Row wrap gap={6}>{services.slice(0, 10).map((s) => <Chip key={s.name} label={s.name} on={f.procedure === s.name} onPress={() => set("procedure")(s.name)} />)}</Row>
        <Field label="Produtos / ativos utilizados" value={f.products_used} onChangeText={set("products_used")} multiline />
        <Field label="Parâmetros (tempo, intensidade, concentração)" value={f.parameters} onChangeText={set("parameters")} />
        <Field label="Observações e reação da pele" value={f.observations} onChangeText={set("observations")} multiline />
        <Field label="Orientações / próximos passos" value={f.next_steps} onChangeText={set("next_steps")} multiline />
        <Button onPress={add}>Registrar evolução</Button>
      </Card>
      <Section title={`Linha do tempo · ${recs.length} registros`}>
        {recs.length === 0 && <Empty icon="clipboard-outline" text="Nenhuma evolução ainda. Registre ao concluir cada sessão." />}
        {recs.map((r) => (
          <Card key={r.id} title={r.procedure} eyebrow={fmtDate(r.record_date)}>
            {detail("Produtos", r.products_used)}
            {detail("Parâmetros", r.parameters)}
            {detail("Observações", r.observations)}
            {detail("Próximos passos", r.next_steps)}
            <ConfirmButton confirmText="Excluir registro" onConfirm={() => write((w) => w.remove("session_records", r.id))} />
          </Card>
        ))}
      </Section>
    </>
  );
}

type Photo = { id: string; path: string; kind: keyof typeof PHOTO_KINDS; taken_on: string; caption: string | null };
type Queued = Photo & { local_uri: string; error: string | null };

/** Miniatura de foto com tipo, data e legenda. */
function PhotoTile({ p, uri, action }: { p: Photo; uri?: string; action: ReactNode }) {
  return (
    <View style={{ width: "48%", minWidth: 150, flexGrow: 1, maxWidth: 260, gap: 4 }}>
      <Image source={uri ? { uri, cacheKey: p.path ?? p.id } : undefined} style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: TONES.bronze.bg }} contentFit="cover" />
      <Txt.muted>{PHOTO_KINDS[p.kind] ?? p.kind} · {fmtDate(p.taken_on, { year: "2-digit" })}{p.caption ? ` · ${p.caption}` : ""}</Txt.muted>
      {action}
    </View>
  );
}

/** Fotos de antes/depois: fila local (offline) e fotos enviadas (URL assinada, on-line). */
function Fotos({ c }: P) {
  const toast = useToast();
  const { connected } = useStatus();
  const { f, set } = useForm({ kind: "antes" as keyof typeof PHOTO_KINDS, taken_on: todaySP() as string | null, caption: "" });
  const { data: queue } = useQuery<Queued>("select * from photo_uploads where client_id = ? order by created_at", [c.id]);
  const { data: photos } = useQuery<Photo>("select * from client_photos where client_id = ? order by taken_on desc, created_at desc", [c.id]);
  const urls = useSignedUrls(connected ? photos.map((p) => p.path) : []);
  useEffect(() => { syncPhotos().catch(() => {}); }, []);
  const add = async (camera: boolean) => {
    try {
      const n = await pickPhotos(camera, c.id, { ...f, taken_on: f.taken_on ?? todaySP() });
      if (!n) return;
      const sent = await syncPhotos().catch(() => 0);
      toast(sent >= n ? (n > 1 ? `${n} fotos enviadas.` : "Foto enviada.") : "Foto salva no aparelho. Será enviada quando houver internet.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível enviar a foto.", "error");
    }
  };
  const remove = (p: Photo) => deletePhoto(p.id, p.path).catch(() => toast("Não foi possível excluir a foto.", "error"));
  return (
    <>
      <Card title="Adicionar fotos">
        <Segmented value={f.kind} options={toOptions(PHOTO_KINDS)} onChange={set("kind")} />
        <Row wrap gap={12}>
          <DateField label="Data" value={f.taken_on} onChange={set("taken_on")} />
          <Field label="Legenda (opcional)" value={f.caption} onChangeText={set("caption")} />
        </Row>
        <Row wrap>
          <Button icon="camera-outline" onPress={() => add(true)}>Tirar foto</Button>
          <Button variant="outline" icon="images-outline" onPress={() => add(false)}>Escolher da galeria</Button>
        </Row>
        <Txt.muted>As fotos ficam em armazenamento privado e só aparecem para a equipe logada. Peça autorização da cliente antes de usar em divulgação.</Txt.muted>
      </Card>
      {queue.length > 0 && (
        <Section title="Aguardando envio" right={connected ? <Button small variant="ghost" icon="cloud-upload-outline" onPress={() => syncPhotos().catch(() => 0)}>Enviar agora</Button> : undefined}>
          <Row wrap gap={10}>
            {queue.map((q) => (
              <PhotoTile key={q.id} p={q} uri={q.local_uri} action={<>
                {!!q.error && <Txt.muted style={{ color: TONES.red.fg }}>{q.error}</Txt.muted>}
                <ConfirmButton confirmText="Descartar" onConfirm={() => discardQueued(q.id, q.local_uri)}>Descartar</ConfirmButton>
              </>} />
            ))}
          </Row>
        </Section>
      )}
      <Section title={`Antes e depois · ${photos.length} fotos`}>
        {!connected && photos.length > 0 && <Txt.muted>Sem internet: as fotos já enviadas aparecem quando o aparelho estiver on-line.</Txt.muted>}
        {photos.length === 0 && queue.length === 0 && <Empty icon="images-outline" text="Nenhuma foto ainda." />}
        <Row wrap gap={10}>
          {photos.map((p) => (
            <PhotoTile key={p.id} p={p} uri={urls[p.path]} action={connected && <ConfirmButton confirmText="Excluir" onConfirm={() => remove(p)} />} />
          ))}
        </Row>
      </Section>
    </>
  );
}

type Pkg = { id: string; name: string; service_id: string; sessions: number; price: number; validity_days: number | null };
type CPkg = { id: string; name: string; sessions_total: number; price: number; purchased_on: string; expires_on: string | null; status: keyof typeof PKG_STATUS; used: number; scheduled: number };

/** Pacotes: venda (com parcelas) e saldo de sessões de cada pacote. */
function Pacotes({ c }: P) {
  const settings = useSettings();
  const toast = useToast();
  const { data: catalog } = useQuery<Pkg>("select * from packages where active = 1 order by name");
  const { data: pkgs } = useQuery<CPkg>(
    `select cp.*, sum(case when a.status = 'concluido' then 1 else 0 end) used, sum(case when a.status in ('solicitado', 'confirmado') then 1 else 0 end) scheduled
     from client_packages cp left join appointments a on a.client_package_id = cp.id where cp.client_id = ? group by cp.id order by cp.purchased_on desc`, [c.id]);
  const { f, set, reset } = useForm({ package_id: null as string | null, price: "", purchased_on: todaySP() as string | null, method: "pix" as PaymentMethod, installments: "1", payment: "pago" });
  const sell = async () => {
    const pkg = catalog.find((p) => p.id === f.package_id);
    if (!pkg) return toast("Escolha o pacote.", "error");
    const price = parseMoney(f.price);
    await sellPackage(settings, c.id, pkg, {
      price: Number.isFinite(price) ? price : Number(pkg.price), purchased: f.purchased_on ?? todaySP(), method: f.method,
      installments: Math.min(Math.max(parseInt(f.installments, 10) || 1, 1), 12), paidNow: f.payment !== "pendente",
    });
    reset();
    toast("Pacote vendido.");
  };
  return (
    <>
      <Card title="Vender pacote" eyebrow="Pacotes">
        {catalog.length === 0 ? <Empty icon="cube-outline" text="Cadastre pacotes em Pacotes." /> : (
          <>
            <Select label="Pacote" value={f.package_id} onChange={set("package_id")}
              options={catalog.map((p) => ({ value: p.id, label: p.name, hint: `${p.sessions} sessões · ${brl(p.price)}` }))} />
            <Row wrap gap={12}>
              <MoneyField label="Valor (vazio = tabela)" value={f.price} onChangeText={set("price")} />
              <DateField label="Data" value={f.purchased_on} onChange={set("purchased_on")} />
            </Row>
            <Segmented value={f.method} options={toOptions(METHOD_LABEL)} onChange={set("method")} />
            <Row wrap gap={12}>
              <Field label="Parcelas" value={f.installments} onChangeText={set("installments")} keyboardType="number-pad" />
              <Select label="Pagamento" value={f.payment} onChange={set("payment")}
                options={[{ value: "pago", label: "Recebido (1ª parcela agora)" }, { value: "pendente", label: "A receber" }]} />
            </Row>
            <Button onPress={sell}>Registrar venda</Button>
          </>
        )}
      </Card>
      <Section title="Pacotes da cliente">
        {pkgs.length === 0 && <Empty icon="cube-outline" text="Nenhum pacote." />}
        {pkgs.map((p) => (
          <Card key={p.id} title={p.name} right={<Badge tone={p.status === "ativo" ? "green" : p.status === "concluido" ? "blue" : "gray"}>{PKG_STATUS[p.status] ?? p.status}</Badge>}>
            <Txt.muted>
              {p.used}/{p.sessions_total} realizadas · {p.scheduled} agendadas · {p.sessions_total - p.used} restantes · comprado em {fmtDate(p.purchased_on)} por {brl(p.price)}
              {p.expires_on ? ` · validade ${fmtDate(p.expires_on)}` : ""}
            </Txt.muted>
            <Segmented value={p.status} options={toOptions(PKG_STATUS)} onChange={(status) => write((w) => w.update("client_packages", p.id, { status }))} />
            {p.status === "ativo" && <Button small icon="calendar-outline" onPress={() => router.push(`/agenda/novo?client_id=${c.id}`)}>Agendar sessão</Button>}
          </Card>
        ))}
      </Section>
    </>
  );
}

/** Histórico de atendimentos e pagamentos da cliente. */
function Historico({ c }: P) {
  const { data: appts } = useQuery<Appt>(`${APPTS} order by a.starts_at desc`, [c.id]);
  const { data: txs } = useQuery<{ id: string; occurred_on: string; description: string | null; category: string; method: PaymentMethod; status: string; amount: number }>(
    "select * from transactions where client_id = ? order by occurred_on desc", [c.id]);
  return (
    <>
      <Section title={`Atendimentos · ${appts.length}`}>
        {appts.length ? appts.map((a) => <ApptItem key={a.id} a={a} />) : <Empty text="Nenhum atendimento ainda." />}
      </Section>
      <Section title="Pagamentos">
        {txs.length === 0 && <Empty text="Nenhum pagamento registrado." />}
        {txs.map((t) => (
          <ListItem key={t.id} title={`${brl(t.amount)} · ${t.description ?? t.category}`} subtitle={`${fmtDate(t.occurred_on, { year: "2-digit" })} · ${METHOD_LABEL[t.method] ?? t.method}`}
            right={t.status === "pendente" ? <Badge tone="gold">a receber</Badge> : <Badge tone="green">pago</Badge>} />
        ))}
      </Section>
    </>
  );
}

type Interaction = { id: string; kind: InteractionKind; content: string; due_on: string | null; done_at: string | null; created_at: string };

/** Relacionamento (CRM): notas, contatos e lembretes com data; concluir e excluir. */
function Crm({ c }: P) {
  const settings = useSettings();
  const toast = useToast();
  const me = useMe();
  const today = todaySP();
  const { f, set, reset } = useForm({ kind: "nota" as keyof typeof KINDS, due_on: null as string | null, content: "" });
  const { data: items } = useQuery<Interaction>("select * from interactions where client_id = ? order by created_at desc", [c.id]);
  const { data: last } = useQuery<{ name: string }>(
    "select s.name from appointments a join services s on s.id = a.service_id where a.client_id = ? and a.status = 'concluido' order by a.starts_at desc limit 1", [c.id]);
  const add = async () => {
    if (!f.content.trim()) return toast("Escreva a anotação.", "error");
    await write((w) => w.insert("interactions", clean({ ...f, client_id: c.id, created_by: me?.id, created_at: nowIso() })));
    reset();
    toast(f.due_on ? "Lembrete agendado." : "Anotação salva.");
  };
  const vars = { nome: firstName(c.name), servico: last[0]?.name ?? "tratamento", clinica: settings.clinic_name };
  return (
    <>
      <Card title="Registrar contato">
        <Segmented value={f.kind} options={toOptions(KINDS)} onChange={set("kind")} />
        <DateField label="Lembrar em" value={f.due_on} onChange={set("due_on")} optional />
        <Field label="Anotação" value={f.content} onChangeText={set("content")} multiline placeholder="O que foi conversado, preferências, próximos passos…" />
        <Button onPress={add}>Registrar</Button>
        {!!c.phone && (
          <Row wrap gap={6}>
            {(["retorno", "reativacao", "aniversario"] as const).map((k) => (
              <Button key={k} small variant="outline" icon="logo-whatsapp" onPress={() => openWa(c.phone, fillTemplate(settings.templates[k], vars))}>
                {{ retorno: "Retorno", reativacao: "Reativação", aniversario: "Aniversário" }[k]}
              </Button>
            ))}
          </Row>
        )}
      </Card>
      <Section title={`Histórico de relacionamento · ${items.length}`}>
        {items.length === 0 && <Empty text="Sem registros ainda." />}
        {items.map((i) => {
          const open = !!i.due_on && !i.done_at;
          return (
            <Card key={i.id} eyebrow={`${INTERACTION_LABEL[i.kind] ?? i.kind} · ${fmtDate(i.created_at)} ${fmtTime(i.created_at)}`}>
              {open && <Badge tone={i.due_on! < today ? "red" : "gold"}>Lembrar {fmtDate(i.due_on, { year: undefined })}</Badge>}
              {!!i.due_on && !!i.done_at && <Badge tone="green">Feito</Badge>}
              <Txt.body>{i.content}</Txt.body>
              <Row>
                {open && <Button small variant="outline" icon="checkmark" onPress={() => write((w) => w.update("interactions", i.id, { done_at: nowIso() }))}>Feito</Button>}
                <ConfirmButton onConfirm={() => write((w) => w.remove("interactions", i.id))} />
              </Row>
            </Card>
          );
        })}
      </Section>
    </>
  );
}
