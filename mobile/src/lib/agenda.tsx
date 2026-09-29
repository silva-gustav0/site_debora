import { useQuery } from "@powersync/react-native";
import { addDays, brl, dateSP, fmtDate, fmtTime, METHOD_LABEL, STATUS_LABEL, todaySP } from "@shared/format";
import { toTimestamp } from "@shared/hours";
import { cardFee } from "@shared/settings-core";
import type { AppointmentStatus, PaymentMethod } from "@shared/types";
import { router, Stack } from "expo-router";
import { CheckCircle2, ChevronRight, Gift, Package, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar, Badge, Button, Field, MoneyField, moneyText, parseMoney, Row, Screen, Select, Toggle, type Tone, Txt, ui, useToast, useWide,
} from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { useMe, useSettings } from "@/db/hooks";
import { write } from "@/db/write";

/** Normaliza timestamps do banco (UTC ou -03:00) para ISO em UTC, legível pelo Date do Hermes. */
export const ts = (col: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${col})`;

export type Appt = {
  id: string; client_id: string | null; service_id: string; starts_at: string; ends_at: string; status: AppointmentStatus;
  price: number; notes: string | null; source: string | null; client_package_id: string | null; public_token: string | null;
  confirmed_at: string | null; reminder_sent_at: string | null; cancel_reason: string | null; voucher_id: string | null;
  voucher_amount: number | null; client_name: string | null; client_phone: string | null; service_name: string | null;
  service_category: string | null; duration_min: number | null; v_code: string | null; v_kind: "servico" | "valor" | null;
  v_balance: number | null; v_service_name: string | null;
};

const APPT_SQL = `select a.id, a.client_id, a.service_id, ${ts("a.starts_at")} as starts_at, ${ts("a.ends_at")} as ends_at, a.status,
  a.price, a.notes, a.source, a.client_package_id, a.public_token, ${ts("a.confirmed_at")} as confirmed_at,
  ${ts("a.reminder_sent_at")} as reminder_sent_at, a.cancel_reason, a.voucher_id, a.voucher_amount, c.name as client_name,
  c.phone as client_phone, s.name as service_name, s.category as service_category, s.duration_min, v.code as v_code,
  v.kind as v_kind, v.balance as v_balance, v.service_name as v_service_name
  from appointments a left join clients c on c.id = a.client_id left join services s on s.id = a.service_id
  left join vouchers v on v.id = a.voucher_id`;

/** Condição SQL e parâmetros para atendimentos que começam entre as datas (inclusive), no fuso de São Paulo. */
export const between = (from: string, to: string, col = "a.starts_at") =>
  [`datetime(${col}) >= datetime(?) and datetime(${col}) < datetime(?)`, toTimestamp(from, "00:00"), toTimestamp(addDays(to, 1), "00:00")] as const;

/** Linhas de uma consulta reativa. */
export const useRows = <T,>(sql: string, params: unknown[] = []) => useQuery<T>(sql, params).data;

/** Atendimentos (com cliente, serviço e voucher) que atendem ao filtro, em ordem de horário. */
export function useAppts(where: string, params: unknown[] = [], limit = 500) {
  return useRows<Appt>(`${APPT_SQL} where ${where} order by datetime(a.starts_at) limit ${limit}`, params);
}

/** Pacotes da cliente com sessões usadas e agendadas (igual à view client_package_usage). */
export const PKG_SQL = `select cp.*, c.name as client_name,
  (select count(*) from appointments x where x.client_package_id = cp.id and x.status = 'concluido') as used,
  (select count(*) from appointments x where x.client_package_id = cp.id and x.status in ('solicitado','confirmado')) as scheduled
  from client_packages cp left join clients c on c.id = cp.client_id`;
export type Pkg = { id: string; client_id: string; service_id: string; name: string; sessions_total: number; expires_on: string | null; client_name: string | null; used: number; scheduled: number };

export const STATUS_TONE: Record<AppointmentStatus, Tone> = { solicitado: "gold", confirmado: "blue", concluido: "green", cancelado: "gray", faltou: "red" };
/** Cores dos eventos na grade (STATUS_STYLE do painel). */
export const STATUS_STYLE: Record<AppointmentStatus, { bg: string; bd: string; fg: string }> = {
  solicitado: { bg: "#FFF4D6", bd: "#D4A73C", fg: "#5C4010" },
  confirmado: { bg: "#EEF1FB", bd: "#6A7BC9", fg: "#34459A" },
  concluido: { bg: "#E3F2E7", bd: "#3F9A5E", fg: "#1D4D2E" },
  cancelado: { bg: "#F1EEE8", bd: "#B8AFA2", fg: "#6E665C" },
  faltou: { bg: "#FBE3E1", bd: "#C0504D", fg: "#7A1F1F" },
};
export const isOpen = (s: string) => s === "solicitado" || s === "confirmado";
export const METHOD_OPTIONS = (Object.keys(METHOD_LABEL) as PaymentMethod[]).map((value) => ({ value, label: METHOD_LABEL[value] }));

/** Linha de atendimento do painel (AppointmentItem): hora, avatar, cliente/serviço e status; abre o detalhe. */
export function ApptItem({ a, showDate }: { a: Appt; showDate?: boolean }) {
  const faded = a.status === "cancelado" || a.status === "faltou";
  return (
    <Pressable
      onPress={() => router.push(`/agendamento/${a.id}`)}
      style={({ pressed }) => [st.item, { borderLeftColor: STATUS_STYLE[a.status].bd }, faded && { opacity: 0.6 }, pressed && { opacity: 0.75 }]}
    >
      <View style={{ width: 56 }}>
        {showDate && <Text style={st.small}>{fmtDate(dateSP(a.starts_at), { year: undefined })}</Text>}
        <Text style={st.time}>{fmtTime(a.starts_at)}</Text>
      </View>
      {a.client_name && <Avatar name={a.client_name} size={32} />}
      <View style={{ flex: 1 }}>
        <Text style={st.name} numberOfLines={1}>{a.client_name ?? "Cliente removido"}</Text>
        <Row gap={4}>
          {a.client_package_id && <Package size={11} color={Brand.gold} />}
          {a.voucher_id && <Gift size={11} color="#1F6B3A" />}
          <Text style={[st.small, { flexShrink: 1 }]} numberOfLines={1}>{a.service_name}</Text>
        </Row>
      </View>
      <Badge tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Badge>
      <ChevronRight size={15} color="#CFC3AE" />
    </Pressable>
  );
}

/** Rótulo pequeno em caixa alta (.p-label). */
export const Label = ({ children }: { children: string }) => <Text style={[ui.label, { marginBottom: 6 }]}>{children.toUpperCase()}</Text>;

/** Gaveta à direita no tablet (Drawer do painel, sobre a tela anterior); no celular, tela comum com "Voltar". */
export function DrawerScreen({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  const wide = useWide();
  if (!wide) return <Screen title={title} eyebrow={eyebrow} back>{children}</Screen>;
  return (
    <View style={st.root}>
      <Stack.Screen options={{ presentation: "transparentModal", animation: "fade" }} />
      <Pressable style={st.backdrop} onPress={() => router.back()} accessibilityLabel="Fechar" />
      <SafeAreaView edges={["top", "bottom", "right"]} style={st.drawer}>
        <View style={st.head}>
          <View style={{ flex: 1, gap: 2 }}>
            {eyebrow && <Txt.eyebrow>{eyebrow}</Txt.eyebrow>}
            <Text style={st.title}>{title}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={st.close} hitSlop={8} accessibilityLabel="Fechar"><X size={16} color={Brand.body} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Quanto o voucher cobre e quanto falta cobrar (mesmo cálculo do painel). */
export function voucherSplit(a: Appt) {
  const price = Number(a.price);
  const covered = !a.v_code ? 0 : a.voucher_amount !== null ? Number(a.voucher_amount) : a.v_kind === "servico" ? price : Math.min(Number(a.v_balance), price);
  return { covered, due: Math.max(0, Math.round((price - covered) * 100) / 100) };
}

export type SessionNote = { observations: string; products: string; next: string; parameters: string };

/** Formulário de conclusão: pagamento (com taxa e voucher) e evolução no prontuário, num único write. */
export function CompleteForm({ a, record, onDone }: { a: Appt; record?: SessionNote; onDone?: () => void }) {
  const settings = useSettings();
  const me = useMe();
  const toast = useToast();
  const { covered, due } = voucherSplit(a);
  const paidByVoucher = !!a.v_code && due === 0;
  const [pay, setPay] = useState(!a.client_package_id);
  const [amount, setAmount] = useState(moneyText(a.v_code ? due : a.price));
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [note, setNote] = useState("");

  const submit = async () => {
    const register = pay && !paidByVoucher;
    const value = parseMoney(amount);
    if (register && !(value > 0)) return toast("Informe o valor recebido.", "error");
    const serviceName = a.service_name ?? "Atendimento";
    const rec = record ?? { observations: note.trim(), products: "", next: "", parameters: "" };
    try {
      await write(async (w) => {
        const cur = await w.get<{ status: string }>("select status from appointments where id = ?", [a.id]);
        if (!cur || cur.status === "concluido") throw new Error("Este atendimento já foi concluído.");
        await w.update("appointments", a.id, { status: "concluido", price: register && !a.v_code ? value : undefined });
        if (register) await w.insert("transactions", {
          kind: "receita", category: "Atendimento", description: a.v_code ? `${serviceName} (diferença do voucher ${a.v_code})` : serviceName,
          amount: value, method, fee: cardFee(settings, method, value), occurred_on: todaySP(), status: "pago",
          client_id: a.client_id, appointment_id: a.id, created_at: new Date().toISOString(),
        });
        if (rec.observations || rec.products || rec.parameters || rec.next) await w.insert("session_records", {
          client_id: a.client_id, appointment_id: a.id, record_date: todaySP(), procedure: serviceName, observations: rec.observations || null,
          products_used: rec.products || null, parameters: rec.parameters || null, next_steps: rec.next || null,
          created_by: me?.id, created_at: new Date().toISOString(),
        });
      });
    } catch (e) {
      return toast(e instanceof Error && e.message.startsWith("Este") ? e.message : "Não foi possível concluir o atendimento.", "error");
    }
    toast(a.v_code && !register ? `Atendimento concluído. Pago com o voucher ${a.v_code}.` : register ? "Atendimento concluído e pagamento registrado." : "Atendimento concluído.");
    onDone?.();
  };

  return (
    <>
      {paidByVoucher ? <Badge tone="green">Já pago pelo voucher {a.v_code}. Não cobre a cliente.</Badge> : (
        <>
          {a.v_code && <Txt.muted>O voucher {a.v_code} cobre {brl(covered)}. Cobre só a diferença.</Txt.muted>}
          <Toggle label="Registrar pagamento" value={pay} onChange={setPay} hint={a.client_package_id ? "Sessão de pacote já paga" : undefined} />
          {pay && (
            <>
              <Row gap={12} style={{ alignItems: "flex-start" }}>
                <MoneyField label={a.v_code ? "Diferença recebida" : "Valor recebido"} value={amount} onChangeText={setAmount} />
                <Select label="Forma" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
              </Row>
              <Txt.muted style={{ fontSize: 11.5 }}>Taxas da maquininha: crédito {settings.fee_credit}% · débito {settings.fee_debit}% (lançadas automaticamente).</Txt.muted>
            </>
          )}
        </>
      )}
      {!record && (
        <Field label="Evolução da sessão (vai para o prontuário)" multiline value={note} onChangeText={setNote}
          placeholder="Como foi a sessão, produtos usados, reação da pele, orientações…" />
      )}
      <Button icon={CheckCircle2} onPress={submit} style={{ alignSelf: record ? "stretch" : "flex-start", minHeight: record ? 56 : 42 }}>{record ? "Concluir e salvar no prontuário" : "Concluir"}</Button>
    </>
  );
}

const st = StyleSheet.create({
  item: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Brand.white, borderWidth: 1, borderColor: "#F0E8DB",
    borderLeftWidth: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  time: { fontFamily: Font.bold, fontSize: 15, color: Brand.ink },
  name: { fontFamily: Font.body, fontSize: 14, color: Brand.ink },
  small: { fontFamily: Font.body, fontSize: 12, color: Brand.muted },
  root: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1, backgroundColor: "rgba(41,32,26,0.35)" },
  drawer: {
    width: 540, maxWidth: "100%", backgroundColor: "#FFFCFB",
    shadowColor: "#29201A", shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: -24, height: 0 }, elevation: 16,
  },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft },
  title: { fontFamily: Font.displayRegular, fontSize: 30, lineHeight: 34, color: Brand.ink },
  close: { width: 38, height: 30, borderRadius: 8, borderWidth: 1, borderColor: Brand.inputLine, alignItems: "center", justifyContent: "center", backgroundColor: Brand.white },
});
