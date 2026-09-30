import { useStatus } from "@powersync/react-native";
import { brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, formatPhone, STATUS_LABEL, whatsappLink } from "@shared/format";
import { toTimestamp } from "@shared/hours";
import type { Settings } from "@shared/types";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  BellRing, CalendarClock, CheckCircle2, ClipboardList, Clock, Gift, MessageCircle, Package, Play, Share2, UserRound, XCircle,
} from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Linking, Share, StyleSheet, Text, View } from "react-native";
import { Avatar, Badge, Button, DateField, Empty, Field, Row, TimeField, Txt, useToast } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { SITE_URL, useSettings } from "@/db/hooks";
import { type Row as DbRow, write } from "@/db/write";
import { discountLabel } from "@shared/welcome";
import { CompleteForm, DrawerScreen, isOpen, Label, PKG_SQL, type Pkg, STATUS_TONE, useAppts, useRows, voucherSplit } from "@/lib/agenda";
import { supabase } from "@/lib/supabase";

/** Linha do resumo com ícone dourado. */
const Info = ({ icon: I, children }: { icon?: typeof Clock; children: ReactNode }) => (
  <Row gap={8} style={{ flexBasis: "46%", flexGrow: 1 }}>{I && <I size={15} color={Brand.gold} />}<Text style={s.info}>{children}</Text></Row>
);

/** Detalhe do agendamento (gaveta do painel): dados, mensagens prontas, status, anamnese, conclusão, remarcação e cancelamento. */
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
  if (!a) return <DrawerScreen title="Atendimento"><Empty text="Atendimento não encontrado." /></DrawerScreen>;

  const day = dateSP(a.starts_at);
  const time = fmtTime(a.starts_at);
  const open = isOpen(a.status);
  const link = a.public_token ? `${SITE_URL}/meu-agendamento/${a.public_token}` : "";
  const vars = { nome: firstName(a.client_name ?? ""), servico: a.service_name ?? "Atendimento", data: fmtDate(day, { year: undefined }), hora: time, clinica: settings.clinic_name, link };
  const wa = (key: keyof Settings["templates"]) => () => Linking.openURL(whatsappLink(a.client_phone, fillTemplate(settings.templates[key], vars)) ?? "");
  const update = (patch: DbRow) => write((w) => w.update("appointments", a.id, patch));
  const { covered, due } = voucherSplit(a);
  const anamnesisMsg = (url: string) => `Olá, ${vars.nome}! Para seu atendimento, preencha sua ficha de anamnese neste link (válido por 2 horas): ${url}`;
  const future = open && Date.parse(a.starts_at) > now;

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
    <DrawerScreen title="Atendimento" eyebrow={a.source === "site" ? "Agendado pelo site" : "Agendado no painel"}>
      <Row gap={12}>
        <Avatar name={a.client_name ?? "?"} size={46} />
        <View style={{ flex: 1 }}>
          <Text style={s.client} numberOfLines={1}>{a.client_name ?? "Cliente removido"}</Text>
          <Txt.muted>{formatPhone(a.client_phone) || "Sem telefone"}</Txt.muted>
        </View>
        {a.client_id && <Button small variant="outline" icon={UserRound} onPress={() => router.push(`/clientes/${a.client_id}`)}>Ficha</Button>}
      </Row>

      <LinearGradient colors={["#FDF7EF", "#FFF9EE"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.summary}>
        <Row style={{ justifyContent: "space-between", width: "100%" }}>
          <Text style={s.service}>{a.service_name ?? "Atendimento"}</Text>
          <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
        </Row>
        <Info icon={CalendarClock}>{fmtWeekday(day)}, {fmtDate(day, { year: undefined })}</Info>
        <Info icon={Clock}>{time}–{fmtTime(a.ends_at)}</Info>
        <Info>Valor: <Text style={{ fontFamily: Font.bold }}>{pkg ? "Pacote" : a.v_code ? (due === 0 ? "Pago (voucher)" : `${brl(due)} + voucher`) : brl(a.price)}</Text></Info>
        <Info>Origem: {a.source === "site" ? "Site" : "Painel"}</Info>
        {pkg && <Info icon={Package}>{pkg.name} · sessão {pkg.used + (a.status === "concluido" ? 0 : 1)} de {pkg.sessions_total}</Info>}
        {Number(a.discount_pct ?? 0) > 0 && (
          <Row gap={8} style={{ ...s.voucher, backgroundColor: "#FFF6DD" }}>
            <Gift size={15} color="#7A5510" />
            <Text style={[s.info, { color: "#7A5510", flex: 1 }]}>Cliente nova · {discountLabel(Number(a.price), Number(a.discount_pct))}</Text>
          </Row>
        )}
        {a.v_code && (
          <Row gap={8} style={s.voucher}>
            <Gift size={15} color="#1F6B3A" />
            <Text style={[s.info, { color: "#1F6B3A", flex: 1 }]}>
              Voucher <Text style={{ fontFamily: Font.bold }}>{a.v_code}</Text> · {a.v_kind === "servico" ? `${a.v_service_name ?? "serviço"} já pago` : `cobre ${brl(covered)}`}
              {due > 0 ? ` · cobrar ${brl(due)}` : ""}
            </Text>
          </Row>
        )}
        {a.confirmed_at && <Text style={s.note}>Confirmado em {fmtDate(a.confirmed_at)} {fmtTime(a.confirmed_at)}</Text>}
        {a.reminder_sent_at && <Text style={s.note}>Lembrete enviado em {fmtDate(a.reminder_sent_at)} {fmtTime(a.reminder_sent_at)}</Text>}
        {a.cancel_reason && <Text style={[s.note, { color: Brand.danger }]}>Motivo: {a.cancel_reason}</Text>}
      </LinearGradient>
      {a.notes && <Text style={[s.info, s.box, { paddingVertical: 12 }]}>“{a.notes}”</Text>}

      {open && <Button variant="gold" icon={Play} style={{ minHeight: 56 }} onPress={() => router.push(`/atendimento/${a.id}`)}>Iniciar atendimento</Button>}

      {a.client_phone && (a.status === "solicitado" || future || a.status === "concluido") && (
        <View>
          <Label>Mensagens prontas</Label>
          <Row wrap>
            {a.status === "solicitado" && <Button small variant="outline" icon={MessageCircle} onPress={wa("confirmacao")}>Confirmação</Button>}
            {future && <Button small variant="outline" icon={BellRing} onPress={wa("lembrete")}>Lembrete</Button>}
            {future && !a.reminder_sent_at && <Button small variant="outline" onPress={() => update({ reminder_sent_at: new Date().toISOString() })}>✓ enviado</Button>}
            {a.status === "concluido" && <Button small variant="outline" icon={MessageCircle} onPress={wa("pos_atendimento")}>Pós-atendimento</Button>}
          </Row>
        </View>
      )}

      {a.client_id && (
        <View>
          <Label>Anamnese</Label>
          <Row wrap>
            <Button small variant="outline" icon={ClipboardList} onPress={sendAnamnesis}>{a.client_phone ? "Enviar link de anamnese" : "Gerar link de anamnese"}</Button>
            {anamnesis && <Button small variant="ghost" icon={Share2} onPress={() => Share.share({ message: anamnesisMsg(anamnesis.url) })}>Compartilhar mensagem</Button>}
          </Row>
          {anamnesis && <Txt.muted style={{ fontSize: 12, marginTop: 6 }}>Link único, vale até {fmtTime(anamnesis.expires)}: {anamnesis.url}</Txt.muted>}
        </View>
      )}

      <Row wrap>
        {a.status === "solicitado" && <Button small icon={CheckCircle2} onPress={() => update({ status: "confirmado", confirmed_at: new Date().toISOString() })}>Confirmar</Button>}
        {open && <Button small variant="outline" onPress={() => update({ status: "faltou" })}>Faltou</Button>}
        {!open && <Button small variant="outline" onPress={() => update({ status: "confirmado", confirmed_at: new Date().toISOString() })}>Reabrir</Button>}
      </Row>

      {open && (
        <>
          <View style={s.box}>
            <Text style={s.boxTitle}>Concluir atendimento</Text>
            <CompleteForm a={a} />
          </View>
          <Row wrap gap={12} style={{ alignItems: "stretch" }}>
            <View style={[s.box, s.half]}>
              <Txt.strong style={{ fontSize: 14 }}>Remarcar</Txt.strong>
              <DateField label="Nova data" value={newDate ?? day} onChange={setNewDate} />
              <TimeField label="Novo horário" value={newTime ?? time} onChange={setNewTime} />
              <Button small variant="outline" onPress={reschedule}>Salvar novo horário</Button>
            </View>
            <View style={[s.box, s.half]}>
              <Txt.strong style={{ fontSize: 14 }}>Cancelar</Txt.strong>
              <Field label="Motivo" value={reason} onChangeText={setReason} placeholder="Motivo (opcional)" />
              <Button small variant="danger" icon={XCircle} onPress={() => update({ status: "cancelado", cancel_reason: reason.trim().slice(0, 300) || "Cancelado pela clínica" })}>Cancelar horário</Button>
            </View>
          </Row>
        </>
      )}

      {link ? <Txt.muted style={{ fontSize: 12 }}>Link do cliente: {link}</Txt.muted> : null}
    </DrawerScreen>
  );
}

const s = StyleSheet.create({
  client: { fontFamily: Font.body, fontSize: 18, color: Brand.ink },
  summary: { borderRadius: 16, borderWidth: 1, borderColor: "#F3E2D8", padding: 16, flexDirection: "row", flexWrap: "wrap", rowGap: 12, columnGap: 12 },
  service: { fontFamily: Font.displayRegular, fontSize: 25, color: Brand.ink, flex: 1 },
  info: { fontFamily: Font.body, fontSize: 14, color: Brand.body, flexShrink: 1 },
  voucher: { width: "100%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#EAF6EE" },
  note: { width: "100%", fontFamily: Font.body, fontSize: 12, color: Brand.muted },
  box: { borderRadius: 16, borderWidth: 1, borderColor: Brand.line, backgroundColor: Brand.white, padding: 16, gap: 12 },
  boxTitle: { fontFamily: Font.displayRegular, fontSize: 21, color: Brand.ink },
  half: { flex: 1, minWidth: 210, gap: 8 },
});
