"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal";
import { digits, METHOD_LABEL, todaySP } from "@/lib/format";
import { bool, fail, isUuid, money, opt, str } from "@/lib/form";
import { newVoucherCode, openAppointmentFor, voucherExpiry, VOUCHER_MAX, VOUCHER_MIN } from "@/lib/vouchers";
import type { ActionState } from "@/lib/types";

/** Voucher vendido no balcão ou dado de cortesia (não passa pela InfinitePay). */
export async function createManualVoucher(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();

  const buyerName = str(fd, "buyer_name", 120);
  if (buyerName.length < 3) return fail("Informe o nome de quem comprou.");
  const buyerPhone = digits(str(fd, "buyer_phone", 30)).slice(0, 13) || null;
  const buyerEmail = opt(fd, "buyer_email", 160)?.toLowerCase() ?? null;
  const forSelf = bool(fd, "for_self");
  const recipientName = forSelf ? null : opt(fd, "recipient_name", 120);
  const message = forSelf ? null : opt(fd, "message", 300);
  if (!forSelf && !recipientName) return fail("Informe o nome de quem vai receber o voucher.");

  let row: { kind: "servico" | "valor"; service_id: string | null; service_name: string | null; amount: number };
  if (str(fd, "kind") === "servico") {
    const { data: s } = await supabase
      .from("services").select("id, name, price").eq("id", str(fd, "service_id", 80)).eq("active", true).maybeSingle();
    if (!s || !(Number(s.price) > 0)) return fail("Escolha um serviço ativo com preço definido.");
    row = { kind: "servico", service_id: s.id, service_name: s.name, amount: Number(s.price) };
  } else {
    const amount = money(fd, "amount");
    if (!(amount >= VOUCHER_MIN && amount <= VOUCHER_MAX)) {
      return fail(`Informe um valor entre R$ ${VOUCHER_MIN} e R$ ${VOUCHER_MAX.toLocaleString("pt-BR")}.`);
    }
    row = { kind: "valor", service_id: null, service_name: null, amount };
  }

  const origem = str(fd, "origem") === "cortesia" ? "cortesia" : "venda";
  const method = str(fd, "method");
  if (origem === "venda" && !(method in METHOD_LABEL)) return fail("Escolha a forma de pagamento.");

  const today = todaySP();

  // Código único (colisão é improvável, mas conferimos).
  let voucher: { id: string; code: string } | null = null;
  for (let i = 0; i < 3 && !voucher; i++) {
    const { data, error } = await supabase.from("vouchers").insert({
      kind: row.kind,
      service_id: row.service_id,
      service_name: row.service_name,
      amount: row.amount,
      balance: row.amount,
      code: newVoucherCode(),
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      for_self: forSelf,
      recipient_name: recipientName,
      message,
      status: "ativo",
      source: "painel",
      paid_at: new Date().toISOString(),
      expires_on: voucherExpiry(today),
      payment: { capture_method: origem === "venda" ? method : "cortesia" },
    }).select("id, code").single();
    if (!error) { voucher = data; break; }
    if (error.code !== "23505") return fail("Não foi possível criar o voucher.");
  }
  if (!voucher) return fail("Não foi possível gerar um código único. Tente novamente.");

  if (origem === "venda") {
    const { error: txError } = await supabase.from("transactions").insert({
      kind: "receita",
      category: "Voucher",
      description: `Voucher ${voucher.code} · ${row.kind === "servico" ? row.service_name : "vale-presente"}`,
      amount: row.amount,
      method,
      fee: 0,
      occurred_on: today,
      status: "pago",
    });
    if (txError) return fail("Voucher criado, mas o lançamento financeiro falhou.");
  }

  revalidatePath("/painel/vouchers");
  redirect(`/painel/vouchers?criado=${voucher.id}`);
}

/** Cancela um voucher ainda não usado, desde que não esteja reservado por um agendamento. */
export async function cancelVoucher(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  if (!isUuid(id)) return;
  const { data: v } = await supabase.from("vouchers").select("id, status").eq("id", id).maybeSingle();
  if (!v || !["ativo", "pendente"].includes(v.status)) return;
  if (await openAppointmentFor(supabase, id)) return;
  await supabase.from("vouchers").update({ status: "cancelado" }).eq("id", id);
  revalidatePath("/painel/vouchers");
}
