import { useQuery } from "@powersync/react-native";
import { brl, fillTemplate, firstName, fmtDate, fmtTime, INTERACTION_LABEL, METHOD_LABEL, STATUS_LABEL, todaySP } from "@shared/format";
import type { InteractionKind, PaymentMethod } from "@shared/types";
import { router } from "expo-router";
import { Check, MessageCircle, Package } from "lucide-react-native";
import { Text, View } from "react-native";
import {
  Badge, Button, Card, ConfirmButton, DateField, Empty, Field, MoneyField, parseMoney, Row, Segmented, Select, useToast,
} from "@/components/ui";
import { Cols, cs, Progress, Table, T, Timeline, TimelineItem } from "@/components/client-ui";
import { useMe, useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import {
  type Appt, APPTS, clean, ClientForm, type CPkg, DeleteClientCard, nowIso, openWa, PKG_STATUS, PKGS_SQL, sellPackage, STATUS_TONE,
  type TabProps, toOptions, useForm,
} from "@/lib/clients";

const KINDS = { nota: "Nota", whatsapp: "WhatsApp", ligacao: "Ligação", followup: "Tarefa" };
type Pkg = { id: string; name: string; service_id: string; sessions: number; price: number; validity_days: number | null };

/** Pacotes: venda (com parcelas) ao lado do saldo de sessões de cada pacote. */
export function Pacotes({ c }: TabProps) {
  const settings = useSettings();
  const toast = useToast();
  const { data: catalog } = useQuery<Pkg>("select * from packages where active = 1 order by name");
  const { data: pkgs } = useQuery<CPkg>(PKGS_SQL, [c.id]);
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
    <Cols side={360}>
      <Card title="Vender pacote" eyebrow="Pacotes">
        {catalog.length === 0 ? <Empty icon={Package} text="Cadastre pacotes em Pacotes." /> : (
          <>
            <Select label="Pacote" value={f.package_id} onChange={set("package_id")}
              options={catalog.map((p) => ({ value: p.id, label: p.name, hint: `${p.sessions} sessões · ${brl(p.price)}` }))} />
            <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
              <MoneyField label="Valor (vazio = tabela)" value={f.price} onChangeText={set("price")} />
              <DateField label="Data" value={f.purchased_on} onChange={set("purchased_on")} />
            </Row>
            <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
              <Select label="Forma" value={f.method} options={toOptions(METHOD_LABEL)} onChange={set("method")} />
              <Field label="Parcelas" value={f.installments} onChangeText={set("installments")} keyboardType="number-pad" />
            </Row>
            <Select label="Pagamento" value={f.payment} onChange={set("payment")}
              options={[{ value: "pago", label: "Recebido (1ª parcela agora)" }, { value: "pendente", label: "A receber" }]} />
            <Button style={{ alignSelf: "flex-start" }} onPress={sell}>Registrar venda</Button>
          </>
        )}
      </Card>
      <Card title="Pacotes da cliente" bodyStyle={{ gap: 14 }}>
        {pkgs.length === 0 && <Empty icon={Package} text="Nenhum pacote." />}
        {pkgs.map((p) => (
          <View key={p.id} style={[cs.box, { padding: 16, gap: 10 }]}>
            <Row wrap style={{ justifyContent: "space-between" }}>
              <Text style={cs.display}>{p.name}</Text>
              <Badge tone={p.status === "ativo" ? "green" : p.status === "concluido" ? "blue" : "gray"}>{PKG_STATUS[p.status] ?? p.status}</Badge>
            </Row>
            <Progress value={Number(p.used)} max={p.sessions_total} />
            <Text style={cs.small}>
              {p.used} realizadas · {p.scheduled} agendadas · {p.sessions_total - p.used} restantes · comprado em {fmtDate(p.purchased_on)} por {brl(p.price)}
              {p.expires_on ? ` · validade ${fmtDate(p.expires_on)}` : ""}
            </Text>
            <Row wrap>
              {p.status === "ativo" && <Button small onPress={() => router.push(`/agenda/novo?client_id=${c.id}`)}>Agendar sessão</Button>}
              <Segmented value={p.status} options={toOptions(PKG_STATUS)} onChange={(status) => write((w) => w.update("client_packages", p.id, { status }))} />
            </Row>
          </View>
        ))}
      </Card>
    </Cols>
  );
}

type Tx = { id: string; occurred_on: string; description: string | null; category: string; method: PaymentMethod; status: string; amount: number };

/** Histórico: tabelas de atendimentos e de pagamentos lado a lado. */
export function Historico({ c }: TabProps) {
  const { data: appts } = useQuery<Appt>(`${APPTS} order by a.starts_at desc`, [c.id]);
  const { data: txs } = useQuery<Tx>("select * from transactions where client_id = ? order by occurred_on desc", [c.id]);
  const received = txs.filter((t) => t.status === "pago").reduce((s, t) => s + Number(t.amount), 0);
  return (
    <Cols>
      <Card title="Atendimentos" eyebrow={`${appts.length} no total`} bodyStyle={{ padding: 0, gap: 0 }}>
        {appts.length === 0 ? <Empty text="Nenhum atendimento ainda." /> : (
          <Table minWidth={420} columns={[{ label: "Data", flex: 1.2 }, { label: "Serviço", flex: 1.6 }, { label: "Situação", flex: 1.1 }, { label: "Valor", flex: 0.9, right: true }]}
            rows={appts.map((a) => ({
              key: a.id, onPress: () => router.push(`/agendamento/${a.id}`),
              cells: [`${fmtDate(a.starts_at, { year: "2-digit" })} ${fmtTime(a.starts_at)}`,
                <Row key="s" wrap gap={4}><T>{a.service ?? "—"}</T>{!!a.client_package_id && <Badge tone="plum">pacote</Badge>}</Row>,
                <Badge key="b" tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>, brl(a.price)],
            }))} />
        )}
      </Card>
      <Card title="Pagamentos" eyebrow={`${brl(received)} recebidos`} bodyStyle={{ padding: 0, gap: 0 }}>
        {txs.length === 0 ? <Empty text="Nenhum pagamento registrado." /> : (
          <Table minWidth={460} columns={[{ label: "Data", flex: 0.9 }, { label: "Descrição", flex: 1.6 }, { label: "Forma", flex: 1 }, { label: "Situação", flex: 1 }, { label: "Valor", flex: 0.9, right: true }]}
            rows={txs.map((t) => ({
              key: t.id,
              cells: [fmtDate(t.occurred_on, { year: "2-digit" }), t.description ?? t.category, METHOD_LABEL[t.method] ?? t.method,
                t.status === "pendente" ? <Badge key="b" tone="gold">a receber</Badge> : <Badge key="b" tone="green">pago</Badge>, brl(t.amount)],
            }))} />
        )}
      </Card>
    </Cols>
  );
}

type Interaction = { id: string; kind: InteractionKind; content: string; due_on: string | null; done_at: string | null; created_at: string };

/** Relacionamento (CRM): registro de contato e mensagens prontas ao lado da linha do tempo. */
export function Crm({ c }: TabProps) {
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
    <Cols side={360}>
      <Card title="Registrar contato">
        <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
          <Select label="Tipo" value={f.kind} options={toOptions(KINDS)} onChange={set("kind")} />
          <DateField label="Lembrar em" value={f.due_on} onChange={set("due_on")} optional />
        </Row>
        <Field label="Anotação" value={f.content} onChangeText={set("content")} multiline placeholder="O que foi conversado, preferências, próximos passos…" />
        <Button style={{ alignSelf: "flex-start" }} onPress={add}>Registrar</Button>
        {!!c.phone && (
          <View style={{ borderTopWidth: 1, borderTopColor: "#F5EEE3", paddingTop: 14, marginTop: 6, gap: 8 }}>
            <Text style={cs.label}>MENSAGENS PRONTAS</Text>
            <Row wrap gap={6}>
              {(["retorno", "reativacao", "aniversario"] as const).map((k) => (
                <Button key={k} small variant="outline" icon={MessageCircle} onPress={() => openWa(c.phone, fillTemplate(settings.templates[k], vars))}>
                  {{ retorno: "Retorno", reativacao: "Reativação", aniversario: "Aniversário" }[k]}
                </Button>
              ))}
            </Row>
          </View>
        )}
      </Card>
      <Card title="Histórico de relacionamento" eyebrow={`${items.length} registros`}>
        {items.length === 0 ? <Empty text="Sem registros ainda." /> : (
          <Timeline>
            {items.map((i) => {
              const open = !!i.due_on && !i.done_at;
              return (
                <TimelineItem key={i.id} dot={open ? "gold" : "soft"}>
                  <Row wrap gap={6}>
                    <Text style={[cs.small, cs.bold]}>{INTERACTION_LABEL[i.kind] ?? i.kind}</Text>
                    <Text style={cs.small}>· {fmtDate(i.created_at)} {fmtTime(i.created_at)}</Text>
                    {open && <Badge tone={i.due_on! < today ? "red" : "gold"}>Lembrar {fmtDate(i.due_on, { year: undefined })}</Badge>}
                    {!!i.due_on && !!i.done_at && <Badge tone="green">Feito</Badge>}
                  </Row>
                  <T>{i.content}</T>
                  <Row gap={6}>
                    {open && <Button small variant="outline" icon={Check} onPress={() => write((w) => w.update("interactions", i.id, { done_at: nowIso() }))}>Feito</Button>}
                    <ConfirmButton onConfirm={() => write((w) => w.remove("interactions", i.id))} />
                  </Row>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </Card>
    </Cols>
  );
}

/** Dados cadastrais editáveis na aba e exclusão da cliente (zona de risco). */
export function Dados({ c }: TabProps) {
  return (
    <>
      <Card title="Dados cadastrais"><ClientForm key={c.id} client={c} onSaved={() => {}} /></Card>
      <DeleteClientCard id={c.id} />
    </>
  );
}
