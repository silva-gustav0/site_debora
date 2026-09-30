import { useQuery } from "@powersync/react-native";
import { brl, dateSP, digits, fmtDate, METHOD_LABEL, todaySP, whatsappLink } from "@shared/format";
import { Gift, Plus } from "lucide-react-native";
import { Linking, Text, View } from "react-native";
import { useState } from "react";
import { Badge, Button, Card, ConfirmButton, Empty, Field, MoneyField, parseMoney, Row, Screen, Segmented, Select, Sheet, Tabs, Toggle, useToast, type Tone } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { asBool, asJson, SITE_URL, useServices, useSettings } from "@/db/hooks";
import { ts } from "@/lib/agenda";
import { newId, save, write } from "@/db/write";
import { METHOD_OPTIONS } from "@/lib/finance";
import { newVoucherCode, STATE_LABEL, VOUCHER_MAX, VOUCHER_MIN, voucherExpiry, voucherState, type VoucherState } from "@/lib/vouchers";

type V = { id: string; code: string; kind: string; service_name: string | null; amount: number; balance: number; buyer_name: string; buyer_phone: string | null; recipient_name: string | null; status: string; order_nsu: string; payment: string | null; expires_on: string | null; created_at: string; paid_at: string | null; for_self: number; source: string };
const TONE: Record<VoucherState, Tone> = { pendente: "gold", ativo: "green", agendado: "blue", usado: "gray", expirado: "red", cancelado: "gray" };
const ORDER: VoucherState[] = ["ativo", "agendado", "usado", "pendente", "expirado", "cancelado"];
const NEW = { origem: "venda", method: "pix", kind: "servico", service: null as string | null, amount: "", buyer: "", phone: "", email: "", self: true, recipient: "", message: "" };
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Vouchers: lista por estado, criação manual (balcão/cortesia), cancelamento e envio pelo WhatsApp. */
export default function Vouchers() {
  const toast = useToast();
  const clinic = useSettings().clinic_name;
  const services = useServices(true).filter((s) => s.price > 0);
  const { data: vouchers } = useQuery<V>(`select *, ${ts("created_at")} as created_at, ${ts("paid_at")} as paid_at from vouchers order by datetime(created_at) desc`);
  const { data: open } = useQuery<{ voucher_id: string }>("select voucher_id from appointments where voucher_id is not null and status in ('solicitado', 'confirmado')");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<VoucherState | null>(null);
  const [form, setForm] = useState<typeof NEW | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof NEW>) => setForm((f) => f && { ...f, ...patch });

  const today = todaySP();
  const reserved = new Set(open.map((o) => o.voucher_id));
  const withState = vouchers.map((v) => ({ v, state: voucherState(v, reserved.has(v.id), today) }));
  const list = withState.filter(({ v, state }) =>
    (!estado || state === estado) && (!q || [v.code, v.buyer_name, v.recipient_name ?? ""].some((t) => normalize(t).includes(normalize(q)))));
  const label = (v: V) => { const cm = asJson<{ capture_method?: string }>(v.payment, {}).capture_method; return cm === "cortesia" ? "Cortesia" : METHOD_LABEL[cm as keyof typeof METHOD_LABEL] ?? cm ?? "—"; };

  const submit = async () => {
    if (!form) return;
    const buyer = form.buyer.trim();
    const svc = services.find((s) => s.id === form.service);
    const amount = form.kind === "servico" ? svc?.price ?? 0 : parseMoney(form.amount);
    if (buyer.length < 3) return setError("Informe o nome de quem comprou.");
    if (!form.self && !form.recipient.trim()) return setError("Informe o nome de quem vai receber o voucher.");
    if (form.kind === "servico" && !svc) return setError("Escolha um serviço ativo com preço definido.");
    if (form.kind === "valor" && !(amount >= VOUCHER_MIN && amount <= VOUCHER_MAX)) return setError(`Informe um valor entre R$ ${VOUCHER_MIN} e R$ ${VOUCHER_MAX.toLocaleString("pt-BR")}.`);
    const now = new Date().toISOString();
    const code = newVoucherCode();
    if (!await save(toast, write(async (w) => {
      await w.insert("vouchers", {
        kind: form.kind, service_id: svc?.id ?? null, service_name: svc?.name ?? null, amount, balance: amount, code, buyer_name: buyer,
        buyer_phone: digits(form.phone).slice(0, 13) || null, buyer_email: form.email.trim().toLowerCase() || null, for_self: form.self,
        recipient_name: form.self ? null : form.recipient.trim(), message: form.self ? null : form.message.trim() || null,
        status: "ativo", source: "painel", order_nsu: newId(), paid_at: now, expires_on: voucherExpiry(today), created_at: now,
        payment: { capture_method: form.origem === "venda" ? form.method : "cortesia" },
      });
      if (form.origem === "venda") {
        await w.insert("transactions", { kind: "receita", category: "Voucher", description: `Voucher ${code} · ${svc?.name ?? "vale-presente"}`, amount, method: form.method, fee: 0, occurred_on: today, status: "pago", created_at: now });
      }
    }))) return;
    toast(`Voucher ${code} criado.`);
    setForm(null);
  };

  const cancel = async (v: V) => {
    if (!await save(toast, write((w) => w.update("vouchers", v.id, { status: "cancelado" })))) return;
    toast("Voucher cancelado. Se estiver reservado por um agendamento, o banco recusa e o aviso aparece nos conflitos.");
  };
  const share = (v: V) => Linking.openURL(whatsappLink(v.buyer_phone, `Olá, ${v.recipient_name ?? v.buyer_name}! Seu voucher da ${clinic} (${v.code}) está aqui: ${SITE_URL}/voucher/${v.order_nsu}`) ?? "");

  const counts = (st: VoucherState) => withState.filter((x) => x.state === st).length;
  const month = today.slice(0, 7);
  const soldMonth = vouchers.filter((v) => v.status !== "pendente" && v.status !== "cancelado" && !!v.paid_at && dateSP(v.paid_at).slice(0, 7) === month);
  const field = (l: string, v: string) => (
    <View key={l} style={{ flexGrow: 1, flexBasis: 150, gap: 2 }}>
      <Text style={{ fontFamily: Font.body, fontSize: 11, letterSpacing: 0.9, color: Brand.label }}>{l.toUpperCase()}</Text>
      <Text style={{ fontFamily: Font.body, fontSize: 14, color: Brand.ink }}>{v}</Text>
    </View>
  );

  return (
    <Screen
      eyebrow="Vendas" title="Vouchers" back
      subtitle={`${counts("ativo")} disponíveis · ${counts("agendado")} agendados · ${soldMonth.length} vendidos no mês (${brl(soldMonth.reduce((n, v) => n + Number(v.amount), 0))})`}
      right={<Button small icon={Plus} onPress={() => { setError(null); setForm({ ...NEW }); }}>Novo voucher</Button>}
    >
      <View style={{ maxWidth: 448 }}><Field label="Buscar" value={q} onChangeText={setQ} placeholder="Código, comprador ou presenteado" /></View>
      <Tabs
        value={estado ?? "todos"} onChange={(v) => setEstado(v === "todos" ? null : (v as VoucherState))}
        options={[{ value: "todos", label: `Todos · ${withState.length}` }, ...ORDER.map((st) => ({ value: st, label: `${STATE_LABEL[st]} · ${counts(st)}` }))]}
      />
      <Card bodyStyle={{ padding: 12, gap: 12 }}>
        {list.length === 0 ? <Empty icon={Gift} text="Nenhum voucher nesta lista." /> : list.map(({ v, state }) => (
          <View key={v.id} style={{ borderWidth: 1, borderColor: "#F0E8DB", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
            <Row wrap style={{ justifyContent: "space-between" }}>
              <Row wrap><Text style={{ fontFamily: Font.bold, fontSize: 16, color: Brand.ink, letterSpacing: 0.5 }}>{v.code}</Text><Badge tone={TONE[state]}>{STATE_LABEL[state]}</Badge></Row>
              <Row wrap>
                {v.buyer_phone && state !== "cancelado" && state !== "pendente" && <Button small variant="ghost" icon="logo-whatsapp" onPress={() => share(v)}>Enviar</Button>}
                {(state === "ativo" || state === "agendado" || state === "pendente") && <ConfirmButton confirmText="Confirmar" onConfirm={() => cancel(v)}>Cancelar</ConfirmButton>}
              </Row>
            </Row>
            <Row wrap gap={16} style={{ alignItems: "flex-start" }}>
              {field("O quê", v.kind === "servico" ? v.service_name ?? "Serviço" : "Vale-presente")}
              {field("Valor", `${brl(v.amount)}${v.kind === "valor" && v.balance < v.amount ? ` · saldo ${brl(v.balance)}` : ""}`)}
              {field("De → Para", `${v.buyer_name}${!asBool(v.for_self) && v.recipient_name ? ` → ${v.recipient_name}` : ""}`)}
              {field("Criado / Pago", `${fmtDate(v.created_at)}${v.paid_at ? ` · pago ${fmtDate(v.paid_at)}` : ""}`)}
              {field("Validade", v.expires_on ? fmtDate(v.expires_on) : "—")}
              {field("Origem", `${v.source === "site" ? "Site" : "Painel"} · ${label(v)}`)}
            </Row>
          </View>
        ))}
      </Card>

      <Sheet visible={!!form} onClose={() => setForm(null)} title="Novo voucher">
        {form && (
          <>
            <Segmented value={form.origem} options={[{ value: "venda", label: "Venda no balcão" }, { value: "cortesia", label: "Cortesia" }]} onChange={(origem) => set({ origem })} />
            {form.origem === "venda" && <Select label="Forma de pagamento" value={form.method} options={METHOD_OPTIONS} onChange={(method) => set({ method })} />}
            <Segmented value={form.kind} options={[{ value: "servico", label: "Serviço" }, { value: "valor", label: "Valor livre" }]} onChange={(kind) => set({ kind })} />
            {form.kind === "servico"
              ? <Select label="Serviço" value={form.service} options={services.map((s) => ({ value: s.id, label: s.name, hint: brl(s.price) }))} onChange={(service) => set({ service })} />
              : <MoneyField label={`Valor (R$ ${VOUCHER_MIN} a ${VOUCHER_MAX.toLocaleString("pt-BR")})`} value={form.amount} onChangeText={(amount) => set({ amount })} />}
            <Field label="Nome de quem comprou" value={form.buyer} onChangeText={(buyer) => set({ buyer })} error={error} />
            <Field label="Telefone (opcional)" value={form.phone} onChangeText={(phone) => set({ phone })} keyboardType="phone-pad" />
            <Field label="E-mail (opcional)" value={form.email} onChangeText={(email) => set({ email })} keyboardType="email-address" autoCapitalize="none" />
            <Toggle label="É para uso de quem comprou" value={form.self} onChange={(self) => set({ self })} />
            {!form.self && (
              <>
                <Field label="Nome de quem vai receber" value={form.recipient} onChangeText={(recipient) => set({ recipient })} />
                <Field label="Mensagem (opcional)" value={form.message} onChangeText={(message) => set({ message })} />
              </>
            )}
            <Button onPress={submit}>Criar voucher</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
