import { useStatus } from "@powersync/react-native";
import { brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, formatPhone, STATUS_LABEL, whatsappLink } from "@shared/format";
import { toTimestamp } from "@shared/hours";
import type { Settings } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Share } from "react-native";
import { Avatar, Badge, Button, Card, DateField, Empty, Field, Row, Screen, Section, TimeField, Txt, useToast } from "@/components/ui";
import { SITE_URL, useSettings } from "@/db/hooks";
import { type Row as DbRow, write } from "@/db/write";
import { CompleteForm, isOpen, PKG_SQL, type Pkg, STATUS_TONE, useAppts, useRows, voucherSplit } from "@/lib/agenda";
import { supabase } from "@/lib/supabase";

/** Detalhe do agendamento: dados, mensagens prontas, status, anamnese, conclusão, remarcação e cancelamento. */
export default function AppointmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useAppts("a.id = ?", [id])[0];
  const pkg = useRows<Pkg>(`${PKG_SQL} where cp.id = ?`, [a?.client_package_id ?? ""])[0];
  const settings = useSettings();
  const { connected } = useStatus();
  const toast = useToast();
  const [newDate, setNewDate] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [now] = useState(Date.now);
  const [anamnesis, setAnamnesis] = useState<{ url: string; expires: string } | null>(null);
  if (!a) return <Screen title="Atendimento" back><Empty text="Atendimento não encontrado." /></Screen>;

  const day = dateSP(a.starts_at);
  const time = fmtTime(a.starts_at);
  const open = isOpen(a.status);
  const link = a.public_token ? `${SITE_URL}/meu-agendamento/${a.public_token}` : "";
  const vars = { nome: firstName(a.client_name ?? ""), servico: a.service_name ?? "Atendimento", data: fmtDate(day, { year: undefined }), hora: time, clinica: settings.clinic_name, link };
  const wa = (key: keyof Settings["templates"]) => () => Linking.openURL(whatsappLink(a.client_phone, fillTemplate(settings.templates[key], vars)) ?? "");
  const update = (patch: DbRow) => write((w) => w.update("appointments", a.id, patch));
  const { covered, due } = voucherSplit(a);
  const anamnesisMsg = (url: string) => `Olá, ${vars.nome}! Para seu atendimento, preencha sua ficha de anamnese neste link (válido por 2 horas): ${url}`;

  const reschedule = async () => {
    const d = newDate ?? day, t = newTime ?? time;
    const startsAt = toTimestamp(d, t);
    await update({ starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + Date.parse(a.ends_at) - Date.parse(a.starts_at)).toISOString(), reminder_sent_at: null });
    toast("Atendimento remarcado.");
  };

  const sendAnamnesis = async () => {
    if (!connected) return toast("Sem internet: o link de anamnese precisa de conexão.", "error");
    await supabase.from("anamnesis_links").update({ revoked_at: new Date().toISOString() }).eq("appointment_id", a.id).is("revoked_at", null);
    const { data, error } = await supabase.from("anamnesis_links").insert({ appointment_id: a.id, client_id: a.client_id }).select("token, expires_at").single();
    if (error || !data) return toast("Não foi possível gerar o link. Aguarde a sincronização e tente de novo.", "error");
    const url = `${SITE_URL}/anamnese/${data.token}`;
    setAnamnesis({ url, expires: data.expires_at });
    const w = whatsappLink(a.client_phone, anamnesisMsg(url));
    if (w) Linking.openURL(w);
  };

  return (
    <Screen title="Atendimento" subtitle={a.source === "site" ? "Agendado pelo site" : "Agendado no painel"} back>
      <Card onPress={a.client_id ? () => router.push(`/clientes/${a.client_id}`) : undefined}>
        <Row>
          <Avatar name={a.client_name ?? "?"} size={46} />
          <Txt.body style={{ flex: 1 }}>{a.client_name ?? "Cliente removido"}{"\n"}<Txt.muted>{formatPhone(a.client_phone) || "Sem telefone"}</Txt.muted></Txt.body>
          {a.client_id && <Badge tone="bronze">Ficha</Badge>}
        </Row>
      </Card>

      <Card title={a.service_name ?? "Atendimento"} right={<Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>}>
        <Txt.body>{fmtWeekday(day)}, {fmtDate(day, { year: undefined })} · {time}–{fmtTime(a.ends_at)}</Txt.body>
        <Txt.body>Valor: {pkg ? "Pacote" : a.v_code ? (due === 0 ? "Pago (voucher)" : `${brl(due)} + voucher`) : brl(a.price)}</Txt.body>
        {pkg && <Txt.muted>{pkg.name} · sessão {pkg.used + (a.status === "concluido" ? 0 : 1)} de {pkg.sessions_total}</Txt.muted>}
        {a.v_code && <Badge tone="green">{`Voucher ${a.v_code} · ${a.v_kind === "servico" ? `${a.v_service_name ?? "serviço"} já pago` : `cobre ${brl(covered)}`}${due > 0 ? ` · cobrar ${brl(due)}` : ""}`}</Badge>}
        {a.confirmed_at && <Txt.muted>Confirmado em {fmtDate(a.confirmed_at)} {fmtTime(a.confirmed_at)}</Txt.muted>}
        {a.reminder_sent_at && <Txt.muted>Lembrete enviado em {fmtDate(a.reminder_sent_at)} {fmtTime(a.reminder_sent_at)}</Txt.muted>}
        {a.cancel_reason && <Txt.muted>Motivo: {a.cancel_reason}</Txt.muted>}
        {a.notes && <Txt.body>“{a.notes}”</Txt.body>}
      </Card>

      {open && <Button icon="play" onPress={() => router.push(`/atendimento/${a.id}`)}>Iniciar atendimento</Button>}

      {a.client_phone && (
        <Section title="Mensagens prontas">
          <Row wrap>
            {a.status === "solicitado" && <Button small variant="outline" icon="logo-whatsapp" onPress={wa("confirmacao")}>Confirmação</Button>}
            {open && Date.parse(a.starts_at) > now && <Button small variant="outline" icon="notifications-outline" onPress={wa("lembrete")}>Lembrete</Button>}
            {open && Date.parse(a.starts_at) > now && !a.reminder_sent_at && <Button small variant="ghost" icon="checkmark" onPress={() => update({ reminder_sent_at: new Date().toISOString() })}>enviado</Button>}
            {a.status === "concluido" && <Button small variant="outline" icon="logo-whatsapp" onPress={wa("pos_atendimento")}>Pós-atendimento</Button>}
          </Row>
        </Section>
      )}

      {a.client_id && (
        <Section title="Anamnese">
          <Row wrap>
            <Button small variant="outline" icon="clipboard-outline" onPress={sendAnamnesis}>{a.client_phone ? "Enviar link de anamnese" : "Gerar link de anamnese"}</Button>
            {anamnesis && <Button small variant="ghost" icon="share-outline" onPress={() => Share.share({ message: anamnesisMsg(anamnesis.url) })}>Compartilhar mensagem</Button>}
          </Row>
          {anamnesis && <Txt.muted>Link único, vale até {fmtTime(anamnesis.expires)}: {anamnesis.url}</Txt.muted>}
        </Section>
      )}

      <Row wrap>
        {a.status === "solicitado" && <Button small icon="checkmark-circle" onPress={() => update({ status: "confirmado", confirmed_at: new Date().toISOString() })}>Confirmar</Button>}
        {open && <Button small variant="outline" onPress={() => update({ status: "faltou" })}>Faltou</Button>}
        {!open && <Button small variant="outline" onPress={() => update({ status: "confirmado", confirmed_at: new Date().toISOString() })}>Reabrir</Button>}
      </Row>

      {open && (
        <>
          <Card title="Concluir atendimento"><CompleteForm a={a} /></Card>
          <Card title="Remarcar">
            <Row wrap>
              <DateField label="Nova data" value={newDate ?? day} onChange={setNewDate} />
              <TimeField label="Novo horário" value={newTime ?? time} onChange={setNewTime} />
            </Row>
            <Button small variant="outline" onPress={reschedule}>Salvar novo horário</Button>
          </Card>
          <Card title="Cancelar">
            <Field label="Motivo" value={reason} onChangeText={setReason} placeholder="Motivo (opcional)" />
            <Button small variant="danger" icon="close-circle-outline" onPress={() => update({ status: "cancelado", cancel_reason: reason.trim().slice(0, 300) || "Cancelado pela clínica" })}>Cancelar horário</Button>
          </Card>
        </>
      )}

      {link ? <Txt.muted>Link do cliente: {link}</Txt.muted> : null}
    </Screen>
  );
}
