"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { digits, SITE_URL } from "@/lib/format";
import {
  createCheckoutLink, findUsableVoucher, infinitePayHandle, newVoucherCode, VOUCHER_MAX, VOUCHER_MIN,
} from "@/lib/vouchers";
import { clientIp, TOO_MANY, withinLimits } from "@/lib/rate-limit";

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
// Sem curingas (% * etc.): o e-mail também é usado em buscas.
const isEmail = (s: string) => /^[a-z0-9._+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(s);

export type VoucherOffer = { id: string; name: string; description: string | null; price: number };

/** Serviços que podem virar voucher: ativos e com preço cadastrado. */
export async function getVoucherOffers(): Promise<VoucherOffer[]> {
  const db = createAdminClient();
  if (!db) return [];
  const { data } = await db.from("services").select("id, name, description, price").eq("active", true).gt("price", 0).order("sort_order").order("name");
  return (data ?? []).map((s) => ({ ...s, price: Number(s.price) }));
}

export type VoucherPurchaseInput = {
  kind: "servico" | "valor";
  serviceId?: string;
  amount?: number;
  forSelf: boolean;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  recipientName?: string;
  message?: string;
  website?: string; // armadilha para robôs
};

export type VoucherPurchaseResult = { ok: true; checkoutUrl: string } | { ok: false; message: string };

/** Registra o voucher como "aguardando pagamento" e devolve o link de pagamento da InfinitePay. */
export async function startVoucherPurchase(input: VoucherPurchaseInput): Promise<VoucherPurchaseResult> {
  if (input.website) return { ok: false, message: "Não foi possível continuar." };
  const buyerName = clean(input.buyerName, 120);
  const buyerEmail = clean(input.buyerEmail, 160).toLowerCase();
  const buyerPhone = digits(input.buyerPhone).slice(0, 13);
  const recipientName = input.forSelf ? "" : clean(input.recipientName, 120);
  const message = input.forSelf ? "" : clean(input.message, 300);

  if (buyerName.length < 3) return { ok: false, message: "Informe seu nome completo." };
  if (!isEmail(buyerEmail)) return { ok: false, message: "Informe um e-mail válido para receber o voucher." };
  if (buyerPhone.length < 10) return { ok: false, message: "Informe um WhatsApp válido com DDD." };
  if (!input.forSelf && recipientName.length < 2) return { ok: false, message: "Informe o nome de quem vai receber o presente." };

  const db = createAdminClient();
  if (!db || !infinitePayHandle()) return { ok: false, message: "A venda de vouchers está indisponível no momento. Fale conosco pelo WhatsApp." };
  if (!(await withinLimits(db, [
    { bucket: "voucher-ip-h", key: await clientIp(), max: 5, windowSec: 3600 },
    { bucket: "voucher-phone-d", key: buyerPhone, max: 6, windowSec: 86_400 },
  ]))) return { ok: false, message: TOO_MANY };

  let row: { kind: "servico" | "valor"; service_id: string | null; service_name: string | null; amount: number };
  if (input.kind === "servico") {
    const { data: s } = await db.from("services").select("id, name, price").eq("id", clean(input.serviceId, 80)).eq("active", true).maybeSingle();
    if (!s || !(Number(s.price) > 0)) return { ok: false, message: "Este serviço não está disponível como voucher." };
    row = { kind: "servico", service_id: s.id, service_name: s.name, amount: Number(s.price) };
  } else {
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!(amount >= VOUCHER_MIN && amount <= VOUCHER_MAX)) {
      return { ok: false, message: `Escolha um valor entre R$ ${VOUCHER_MIN} e R$ ${VOUCHER_MAX.toLocaleString("pt-BR")}.` };
    }
    row = { kind: "valor", service_id: null, service_name: null, amount };
  }

  // Código único (colisão é improvável, mas conferimos).
  let voucher: { id: string; order_nsu: string } | null = null;
  for (let i = 0; i < 3 && !voucher; i++) {
    const { data, error } = await db.from("vouchers").insert({
      ...row, balance: row.amount, code: newVoucherCode(), status: "pendente", source: "site",
      buyer_name: buyerName, buyer_email: buyerEmail, buyer_phone: buyerPhone,
      for_self: input.forSelf, recipient_name: recipientName || null, message: message || null,
    }).select("id, order_nsu").single();
    if (!error) voucher = data;
    else if (error.code !== "23505") break;
  }
  if (!voucher) return { ok: false, message: "Não foi possível iniciar a compra. Tente novamente." };

  const checkoutUrl = await createCheckoutLink({
    orderNsu: voucher.order_nsu,
    amount: row.amount,
    description: row.kind === "servico" ? `Voucher · ${row.service_name}` : "Vale-presente Clínica Débora Silva",
    redirectUrl: `${SITE_URL}/voucher/retorno`,
    webhookUrl: `${SITE_URL}/api/infinitepay/webhook`,
    customer: { name: buyerName, email: buyerEmail, phone: buyerPhone },
  });
  if (!checkoutUrl) {
    await db.from("vouchers").delete().eq("id", voucher.id).eq("status", "pendente");
    return { ok: false, message: "Não foi possível abrir o pagamento agora. Tente novamente em instantes." };
  }
  return { ok: true, checkoutUrl };
}

export type VoucherCheck =
  | { ok: true; code: string; kind: "servico" | "valor"; serviceId: string | null; serviceName: string | null; balance: number }
  | { ok: false; message: string };

/** Confere o código digitado no agendamento (não reserva; a reserva acontece ao agendar). */
export async function checkVoucherCode(code: string): Promise<VoucherCheck> {
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Não foi possível conferir agora." };
  if (!(await withinLimits(db, [{ bucket: "voucher-check-ip-h", key: await clientIp(), max: 20, windowSec: 3600 }]))) {
    return { ok: false, message: TOO_MANY };
  }
  const r = await findUsableVoucher(db, clean(code, 30));
  if (!r.ok) return r;
  const v = r.voucher;
  return { ok: true, code: v.code, kind: v.kind, serviceId: v.service_id, serviceName: v.service_name, balance: v.balance };
}

