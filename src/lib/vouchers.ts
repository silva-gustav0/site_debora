import "server-only";
import { randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { todaySP } from "./format";

export const VOUCHER_MIN = 50;
export const VOUCHER_MAX = 2000;
export const VOUCHER_MONTHS = 6;

export type VoucherRow = {
  id: string;
  code: string;
  kind: "servico" | "valor";
  service_id: string | null;
  service_name: string | null;
  amount: number;
  balance: number;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  for_self: boolean;
  recipient_name: string | null;
  message: string | null;
  status: "pendente" | "ativo" | "usado" | "cancelado";
  source: "site" | "painel";
  order_nsu: string;
  payment: { transaction_nsu?: string; slug?: string; capture_method?: string; receipt_url?: string; paid_amount?: number; installments?: number } | null;
  paid_at: string | null;
  expires_on: string | null;
  used_at: string | null;
  created_at: string;
};

// Sem 0/O e 1/I, para não confundir ao digitar.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const newVoucherCode = () => `DS-${block()}-${block()}`;

/** Aceita o código digitado de qualquer jeito ("ds 7kq4m2xp", "DS-7KQ4-M2XP"). */
export function normalizeCode(input: string) {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^DS/, "");
  return raw.length === 8 ? `DS-${raw.slice(0, 4)}-${raw.slice(4)}` : null;
}

/** Data de validade: hoje + 6 meses (no fuso de São Paulo). */
export function voucherExpiry(today = todaySP()) {
  const [y, m, d] = today.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + VOUCHER_MONTHS, d, 12));
  if (target.getUTCDate() !== d) target.setUTCDate(0); // 31/08 + 6 meses → 28/02
  return target.toISOString().slice(0, 10);
}

export type VoucherState = "pendente" | "ativo" | "agendado" | "usado" | "expirado" | "cancelado";

export function voucherState(v: Pick<VoucherRow, "status" | "expires_on">, hasOpenAppointment: boolean, today = todaySP()): VoucherState {
  if (v.status !== "ativo") return v.status;
  if (hasOpenAppointment) return "agendado";
  if (v.expires_on && v.expires_on < today) return "expirado";
  return "ativo";
}

export const STATE_LABEL: Record<VoucherState, string> = {
  pendente: "Aguardando pagamento", ativo: "Disponível", agendado: "Agendado", usado: "Usado", expirado: "Expirado", cancelado: "Cancelado",
};

/** Agendamento em aberto (a confirmar/confirmado) que já reservou o voucher. */
export async function openAppointmentFor(db: SupabaseClient, voucherId: string, exceptAppointment?: string) {
  let q = db.from("appointments").select("id, starts_at").eq("voucher_id", voucherId).in("status", ["solicitado", "confirmado"]);
  if (exceptAppointment) q = q.neq("id", exceptAppointment);
  const { data } = await q.limit(1).maybeSingle();
  return data as { id: string; starts_at: string } | null;
}

export type UsableVoucher =
  | { ok: true; voucher: VoucherRow }
  | { ok: false; message: string };

/** Confere se o código pode ser usado num novo agendamento. */
export async function findUsableVoucher(db: SupabaseClient, input: string): Promise<UsableVoucher> {
  const code = normalizeCode(input);
  if (!code) return { ok: false, message: "Código inválido. Ele tem o formato DS-XXXX-XXXX." };
  const { data } = await db.from("vouchers").select("*").eq("code", code).maybeSingle();
  const v = data as VoucherRow | null;
  if (!v || v.status === "pendente") return { ok: false, message: "Voucher não encontrado. Confira o código." };
  if (v.status === "cancelado") return { ok: false, message: "Este voucher foi cancelado. Fale com a clínica." };
  if (v.status === "usado" || Number(v.balance) <= 0) return { ok: false, message: "Este voucher já foi usado." };
  if (v.expires_on && v.expires_on < todaySP()) return { ok: false, message: "Este voucher expirou. Fale com a clínica pelo WhatsApp." };
  if (await openAppointmentFor(db, v.id)) return { ok: false, message: "Este voucher já está reservado para um agendamento." };
  return { ok: true, voucher: { ...v, amount: Number(v.amount), balance: Number(v.balance) } };
}

// ─── InfinitePay (checkout por link) ─────────────────────────────────────
const API = "https://api.checkout.infinitepay.io";
export const infinitePayHandle = () => (process.env.INFINITEPAY_HANDLE ?? "").replace(/^\$/, "").trim();

/** Cria o link de pagamento; o preço vai em centavos. */
export async function createCheckoutLink(input: {
  orderNsu: string; amount: number; description: string; redirectUrl: string; webhookUrl: string;
  customer: { name: string; email?: string | null; phone?: string | null };
}): Promise<string | null> {
  const handle = infinitePayHandle();
  if (!handle) return null;
  const phone = (input.customer.phone ?? "").replace(/\D/g, "");
  const res = await fetch(`${API}/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle,
      order_nsu: input.orderNsu,
      redirect_url: input.redirectUrl,
      webhook_url: input.webhookUrl,
      items: [{ quantity: 1, price: Math.round(input.amount * 100), description: input.description.slice(0, 120) }],
      customer: {
        name: input.customer.name,
        ...(input.customer.email ? { email: input.customer.email } : {}),
        ...(phone ? { phone_number: `+${phone.startsWith("55") ? phone : `55${phone}`}` } : {}),
      },
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) {
    console.error("InfinitePay /links", res?.status, await res?.text().catch(() => ""));
    return null;
  }
  const data = await res.json().catch(() => null) as Record<string, unknown> | null;
  const url = data?.url ?? data?.link ?? data?.checkout_url;
  return typeof url === "string" && url.startsWith("https://") ? url : null;
}

export type PaymentCheck = { paid: boolean; amount: number; paid_amount: number; installments: number; capture_method: string };

/** Pergunta à InfinitePay se o pedido foi pago (o aviso por webhook não é assinado, então sempre confirmamos aqui). */
export async function checkPayment(input: { orderNsu: string; transactionNsu: string; slug: string }): Promise<PaymentCheck | null> {
  const handle = infinitePayHandle();
  if (!handle || !input.transactionNsu || !input.slug) return null;
  const res = await fetch(`${API}/payment_check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, order_nsu: input.orderNsu, transaction_nsu: input.transactionNsu, slug: input.slug }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  const d = await res.json().catch(() => null) as Record<string, unknown> | null;
  if (!d || d.success === false) return null;
  return {
    paid: d.paid === true,
    amount: Number(d.amount ?? 0),
    paid_amount: Number(d.paid_amount ?? 0),
    installments: Number(d.installments ?? 1),
    capture_method: String(d.capture_method ?? ""),
  };
}

/**
 * Libera o voucher depois de confirmar o pagamento com a InfinitePay. Idempotente: pode ser
 * chamada pelo webhook e pela página de retorno; só a primeira muda o status e lança a receita.
 */
export async function activatePaidVoucher(
  db: SupabaseClient,
  input: { orderNsu: string; transactionNsu: string; slug: string; receiptUrl?: string | null },
): Promise<VoucherRow | null> {
  const { data } = await db.from("vouchers").select("*").eq("order_nsu", input.orderNsu).maybeSingle();
  const v = data as VoucherRow | null;
  if (!v) return null;
  if (v.status !== "pendente") return v;

  const check = await checkPayment(input);
  if (!check?.paid || check.amount < Math.round(Number(v.amount) * 100)) return v;

  const today = todaySP();
  const { data: updated } = await db.from("vouchers").update({
    status: "ativo",
    paid_at: new Date().toISOString(),
    expires_on: voucherExpiry(today),
    payment: {
      transaction_nsu: input.transactionNsu, slug: input.slug, receipt_url: input.receiptUrl ?? undefined,
      capture_method: check.capture_method, paid_amount: check.paid_amount / 100, installments: check.installments,
    },
  }).eq("id", v.id).eq("status", "pendente").select("*").maybeSingle();
  if (!updated) return (await db.from("vouchers").select("*").eq("id", v.id).single()).data as VoucherRow;

  await db.from("transactions").insert({
    kind: "receita", category: "Voucher", status: "pago", occurred_on: today, fee: 0,
    description: `Voucher ${v.code} · ${v.kind === "servico" ? v.service_name : "vale-presente"}`,
    amount: Number(v.amount), method: check.capture_method === "pix" ? "pix" : "credito",
  });
  return updated as VoucherRow;
}

/** Link público do voucher (página com código e QR). O order_nsu é um UUID impossível de adivinhar. */
export const voucherPath = (v: Pick<VoucherRow, "order_nsu">) => `/voucher/${v.order_nsu}`;
