import { useQuery } from "@powersync/react-native";
import { brl, digits, fmtDate, METHOD_LABEL, todaySP, whatsappLink } from "@shared/format";
import { Linking } from "react-native";
import { useState } from "react";
import { Badge, Button, Chip, ConfirmButton, Empty, Field, ListItem, MoneyField, parseMoney, Row, Screen, Segmented, Select, Sheet, Toggle, useToast, type Tone } from "@/components/ui";
import { asJson, SITE_URL, useServices, useSettings } from "@/db/hooks";
import { newId, write } from "@/db/write";
import { METHOD_OPTIONS } from "@/lib/finance";
import { newVoucherCode, STATE_LABEL, VOUCHER_MAX, VOUCHER_MIN, voucherExpiry, voucherState, type VoucherState } from "@/lib/vouchers";

type V = { id: string; code: string; kind: string; service_name: string | null; amount: number; balance: number; buyer_name: string; buyer_phone: string | null; recipient_name: string | null; status: string; order_nsu: string; payment: string | null; expires_on: string | null };
const TONE: Record<VoucherState, Tone> = { pendente: "gold", ativo: "green", agendado: "blue", usado: "gray", expirado: "red", cancelado: "gray" };
const ORDER = Object.keys(TONE) as VoucherState[];
const NEW = { origem: "venda", method: "pix", kind: "servico", service: null as string | null, amount: "", buyer: "", phone: "", email: "", self: true, recipient: "", message: "" };
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Vouchers: lista por estado, criação manual (balcão/cortesia), cancelamento e envio pelo WhatsApp. */
export default function Vouchers() {
  const toast = useToast();
  const clinic = useSettings().clinic_name;
  const services = useServices(true).filter((s) => s.price > 0);
  const { data: vouchers } = useQuery<V>("select * from vouchers order by created_at desc");
  const { data: open } = useQuery<{ voucher_id: string }>("select voucher_id from appointments where voucher_id is not null and status in ('solicitado', 'confirmado')");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<VoucherState | null>(null);
  const [form, setForm] = useState<typeof NEW | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof NEW>) => setForm((f) => f && { ...f, ...patch });

  const today = todaySP();
  const reserved = new Set(open.map((o) => o.voucher_id));
  const list = vouchers.map((v) => ({ v, state: voucherState(v, reserved.has(v.id), today) })).filter(({ v, state }) =>
    (!estado || state === estado) && (!q || [v.code, v.buyer_name, v.recipient_name ?? ""].some((t) => normalize(t).includes(normalize(q)))));
  const label = (v: V) => { const cm = asJson<{ capture_method?: string }>(v.payment, {}).capture_method; return cm === "cortesia" ? "Cortesia" : METHOD_LABEL[cm as keyof typeof METHOD_LABEL] ?? cm ?? "—"; };

  const save = async () => {
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
    await write(async (w) => {
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
    });
    toast(`Voucher ${code} criado.`);
    setForm(null);
  };

  const cancel = async (v: V) => {
    await write((w) => w.update("vouchers", v.id, { status: "cancelado" }));
    toast("Voucher cancelado. Se estiver reservado por um agendamento, o banco recusa e o aviso aparece nos conflitos.");
  };
  const share = (v: V) => Linking.openURL(whatsappLink(v.buyer_phone, `Olá, ${v.recipient_name ?? v.buyer_name}! Seu voucher da ${clinic} (${v.code}) está aqui: ${SITE_URL}/voucher/${v.order_nsu}`) ?? "");

  return (
    <Screen title="Vouchers" back right={<Button small icon="add" onPress={() => { setError(null); setForm({ ...NEW }); }}>Novo</Button>}>
      <Field label="Buscar" value={q} onChangeText={setQ} placeholder="Código ou nome" />
      <Row wrap>
        <Chip label="Todos" on={!estado} onPress={() => setEstado(null)} />
        {ORDER.map((s) => <Chip key={s} label={STATE_LABEL[s]} on={estado === s} onPress={() => setEstado(s)} />)}
      </Row>
      {list.length === 0 ? <Empty icon="gift-outline" text="Nenhum voucher encontrado." /> : list.map(({ v, state }) => (
        <ListItem
          key={v.id}
          title={`${v.code} · ${brl(v.balance)} de ${brl(v.amount)}`}
          subtitle={`${v.kind === "servico" ? v.service_name : "Vale-presente"} · ${v.buyer_name}${v.recipient_name ? ` → ${v.recipient_name}` : ""} · ${label(v)}${v.expires_on ? ` · vence ${fmtDate(v.expires_on)}` : ""}`}
          right={
            <Row wrap>
              <Badge tone={TONE[state]}>{STATE_LABEL[state]}</Badge>
              {v.buyer_phone && state !== "cancelado" && state !== "pendente" && <Button small variant="outline" icon="logo-whatsapp" onPress={() => share(v)}>Enviar</Button>}
              {(state === "ativo" || state === "agendado" || state === "pendente") && <ConfirmButton confirmText="Confirmar" onConfirm={() => cancel(v)}>Cancelar</ConfirmButton>}
            </Row>
          }
        />
      ))}

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
            <Button onPress={save}>Criar voucher</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
