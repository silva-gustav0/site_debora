"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { anamnesisUpdate } from "@/lib/anamnesis";
import { formOrDefault } from "@/lib/anamnesis-schema";
import { getAnamnesisLink } from "@/lib/anamnesis-link";
import { addDays, digits, todaySP } from "@/lib/format";
import { dayHours, freeSlots, toTimestamp, SP_OFFSET } from "@/lib/hours";
import { getSettings } from "@/lib/settings";
import { findUsableVoucher } from "@/lib/vouchers";
import { clientIp, TOO_MANY, withinLimits } from "@/lib/rate-limit";
import { currentClient } from "@/lib/client-account";
import type { ActionState, BusinessHours, ServiceRow, Settings } from "@/lib/types";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

const ACTIVE_STATUSES = ["solicitado", "confirmado", "concluido"];

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s: unknown): s is string => typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
const isUuid = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
// Sem curingas (% * etc.): o e-mail também é usado em buscas.
const isEmail = (s: string) => /^[a-z0-9._+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(s);

export type PublicConfig = {
  services: ServiceRow[];
  hours: BusinessHours;
  maxDaysAhead: number;
  whatsapp: string;
};

/** Dados que o site precisa para montar o agendamento. null = banco não configurado. */
export async function getPublicConfig(): Promise<PublicConfig | null> {
  const db = createAdminClient();
  if (!db) return null;
  const [{ data, error }, settings] = await Promise.all([
    db.from("services").select("*").eq("active", true).order("sort_order"),
    getSettings(db),
  ]);
  if (error) return null;
  return {
    services: data as ServiceRow[],
    hours: settings.business_hours,
    maxDaysAhead: settings.max_days_ahead,
    whatsapp: settings.whatsapp,
  };
}

async function loadBusy(db: Admin, date: string) {
  const from = `${date}T00:00:00${SP_OFFSET}`;
  const to = `${addDays(date, 1)}T00:00:00${SP_OFFSET}`;
  const [appts, blocks] = await Promise.all([
    db.from("appointments").select("starts_at, ends_at").in("status", ACTIVE_STATUSES).lt("starts_at", to).gt("ends_at", from),
    db.from("time_blocks").select("starts_at, ends_at").lt("starts_at", to).gt("ends_at", from),
  ]);
  if (appts.error) throw appts.error;
  return [...(appts.data ?? []), ...(blocks.data ?? [])];
}

function validDay(date: string, s: Settings) {
  const today = todaySP();
  return date >= today && date <= addDays(today, s.max_days_ahead) && dayHours(date, s.business_hours) !== null;
}

async function slotsFor(db: Admin, s: Settings, date: string, duration: number) {
  const busy = await loadBusy(db, date);
  const notBefore = new Date(Date.now() + s.min_lead_min * 60_000);
  return freeSlots(date, duration, busy, notBefore, s.business_hours, s.slot_step_min);
}

export async function getAvailability(date: string, serviceId: string) {
  const db = createAdminClient();
  if (!db || !isDate(date)) return { ok: false as const, slots: [] };
  const settings = await getSettings(db);
  if (!validDay(date, settings)) return { ok: false as const, slots: [] };

  const { data: service } = await db
    .from("services").select("duration_min").eq("id", serviceId).eq("active", true).maybeSingle();
  if (!service) return { ok: false as const, slots: [] };

  return { ok: true as const, slots: await slotsFor(db, settings, date, service.duration_min) };
}

export type BookingInput = {
  serviceId: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
  voucherCode?: string;
  website?: string; // honeypot
};

export type BookingResult =
  | { ok: true; serviceName: string; date: string; time: string; token: string; discountPct: number; voucher?: { code: string; covered: number; due: number } }
  | { ok: false; message: string; slotTaken?: boolean };

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  if (input.website) return { ok: false, message: "Não foi possível enviar." };

  // Com conta no site, agenda na ficha da conta (o número não pode ser trocado pelo navegador).
  const account = await currentClient();
  const name = account?.name ?? clean(input.name, 120);
  const phone = account?.phone ?? digits(input.phone).slice(0, 13);
  const email = clean(input.email, 160).toLowerCase();
  const notes = clean(input.notes, 500);

  if (name.length < 3) return { ok: false, message: "Informe seu nome completo." };
  if (phone.length < 10) return { ok: false, message: "Informe um WhatsApp válido com DDD." };
  if (email && !isEmail(email)) return { ok: false, message: "Informe um e-mail válido." };
  if (!isDate(input.date) || !isTime(input.time)) return { ok: false, message: "Data ou horário inválido." };

  const db = createAdminClient();
  if (!db) return { ok: false, message: "Agendamento online indisponível no momento. Fale conosco pelo WhatsApp." };
  const ip = await clientIp();
  if (!(await withinLimits(db, [
    { bucket: "booking-ip-h", key: ip, max: 8, windowSec: 3600 },
    { bucket: "booking-ip-d", key: ip, max: 20, windowSec: 86_400 },
    { bucket: "booking-phone-d", key: phone, max: 8, windowSec: 86_400 },
  ]))) return { ok: false, message: TOO_MANY };

  // Cada WhatsApp pode ter no máximo 2 pedidos do site aguardando confirmação.
  const { count: openRequests } = await db.from("appointments")
    .select("id, clients!inner(phone)", { count: "exact", head: true })
    .eq("clients.phone", phone).eq("source", "site").eq("status", "solicitado").gte("starts_at", new Date().toISOString());
  if ((openRequests ?? 0) >= 2) {
    return { ok: false, message: "Você já tem pedidos aguardando confirmação. Fale conosco pelo WhatsApp para agendar mais horários." };
  }

  const settings = await getSettings(db);
  if (!validDay(input.date, settings)) return { ok: false, message: "Data indisponível para agendamento." };

  // Voucher: conferido de novo aqui (não confie no navegador). Voucher de serviço fixa o serviço.
  const voucherRes = input.voucherCode ? await findUsableVoucher(db, clean(input.voucherCode, 30)) : null;
  if (voucherRes && !voucherRes.ok) return { ok: false, message: voucherRes.message };
  const voucher = voucherRes?.ok ? voucherRes.voucher : null;
  const serviceId = voucher?.kind === "servico" && voucher.service_id ? voucher.service_id : input.serviceId;

  const { data: service } = await db
    .from("services").select("id, name, duration_min, price").eq("id", serviceId).eq("active", true).maybeSingle();
  if (!service) return { ok: false, message: voucher ? "O serviço deste voucher não está disponível no momento. Fale conosco pelo WhatsApp." : "Serviço indisponível." };

  // Revalida o horário no servidor (não confie no que veio do navegador).
  const slot = (await slotsFor(db, settings, input.date, service.duration_min)).find((s) => s.time === input.time);
  if (!slot?.available) {
    return { ok: false, slotTaken: true, message: "Esse horário acabou de ficar indisponível. Escolha outro, por favor." };
  }

  const clientId = account?.id ?? await upsertClient(db, { name, phone, email });
  if (!clientId) return { ok: false, message: "Não foi possível registrar seus dados. Tente novamente." };

  const startsAt = toTimestamp(input.date, input.time);
  const endsAt = new Date(Date.parse(startsAt) + service.duration_min * 60_000).toISOString();

  const { data, error } = await db.from("appointments").insert({
    client_id: clientId,
    service_id: service.id,
    starts_at: startsAt,
    ends_at: endsAt,
    price: service.price,
    notes: notes || null,
    source: "site",
    status: "solicitado",
    voucher_id: voucher?.id ?? null,
  }).select("public_token, discount_pct").single();
  if (error) {
    if (error.code === "23505" && voucher) return { ok: false, message: "Este voucher acabou de ser reservado para outro agendamento." };
    if (error.code === "23P01") {
      return { ok: false, slotTaken: true, message: "Esse horário acabou de ser reservado. Escolha outro, por favor." };
    }
    return { ok: false, message: "Não foi possível concluir o agendamento. Tente novamente." };
  }

  const price = Number(service.price);
  const covered = voucher ? (voucher.kind === "servico" ? price : Math.min(voucher.balance, price)) : 0;
  return {
    ok: true, serviceName: service.name, date: input.date, time: input.time, token: data.public_token, discountPct: Number(data.discount_pct),
    ...(voucher ? { voucher: { code: voucher.code, covered, due: Math.max(0, Math.round((price - covered) * 100) / 100) } } : {}),
  };
}

// ─── Área da cliente (link com token) ──────────────────────────────────
export type PublicBooking = {
  token: string;
  status: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  price: number;
  canCancel: boolean;
  cancelMinHours: number;
  whatsapp: string;
  clinicName: string;
  address: string;
};

export async function getBookingByToken(token: string): Promise<PublicBooking | null> {
  if (!isUuid(token)) return null;
  const db = createAdminClient();
  if (!db) return null;
  const [{ data }, settings] = await Promise.all([
    db.from("appointments")
      .select("public_token, status, starts_at, ends_at, price, services(name)")
      .eq("public_token", token).maybeSingle(),
    getSettings(db),
  ]);
  if (!data) return null;
  const svc = data.services as unknown as { name: string } | null;
  const hoursLeft = (Date.parse(data.starts_at) - Date.now()) / 3_600_000;
  return {
    token: data.public_token,
    status: data.status,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    serviceName: svc?.name ?? "Atendimento",
    price: Number(data.price),
    canCancel: ["solicitado", "confirmado"].includes(data.status) && hoursLeft >= settings.cancel_min_hours,
    cancelMinHours: settings.cancel_min_hours,
    whatsapp: settings.whatsapp,
    clinicName: settings.clinic_name,
    address: settings.address,
  };
}

export async function cancelBookingByToken(token: string, reason: string): Promise<{ ok: boolean; message: string }> {
  const booking = await getBookingByToken(token);
  if (!booking) return { ok: false, message: "Agendamento não encontrado." };
  if (!booking.canCancel) {
    return { ok: false, message: `Cancelamentos pelo site só até ${booking.cancelMinHours}h antes. Fale conosco pelo WhatsApp.` };
  }
  const db = createAdminClient()!;
  const { error } = await db
    .from("appointments")
    .update({ status: "cancelado", cancel_reason: clean(reason, 300) || "Cancelado pela cliente pelo site" })
    .eq("public_token", token)
    .in("status", ["solicitado", "confirmado"]);
  if (error) return { ok: false, message: "Não foi possível cancelar. Tente novamente." };
  return { ok: true, message: "Agendamento cancelado." };
}

// ─── Anamnese pelo link ────────────────────────────────────────────────
/** Grava a ficha preenchida pelo cliente, desde que o link ainda seja válido; registra no histórico do CRM. */
export async function submitAnamnesisByToken(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const link = await getAnamnesisLink(clean(fd.get("token"), 40));
  if (link.state !== "ok") return { ok: false, message: "Este link expirou ou não é mais válido. Peça um novo à clínica." };
  const db = createAdminClient()!;
  if (!(await withinLimits(db, [{ bucket: "anamnesis-ip-h", key: await clientIp(), max: 20, windowSec: 3600 }]))) {
    return { ok: false, message: TOO_MANY };
  }
  const settings = await getSettings(db);
  const { error } = await db.from("clients")
    .update(anamnesisUpdate(fd, "cliente", formOrDefault(settings.anamnesis_form), link.anamnesis)).eq("id", link.clientId);
  if (error) return { ok: false, message: "Não foi possível enviar. Tente novamente." };
  await Promise.all([
    db.from("anamnesis_links").update({ submitted_at: new Date().toISOString() }).eq("token", link.token),
    link.submittedAt ? null : db.from("interactions").insert({ client_id: link.clientId, kind: "nota", content: "Anamnese preenchida pelo cliente pelo link." }),
  ]);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Recebemos sua ficha. Obrigada! Você pode corrigir algo e enviar de novo enquanto o link estiver válido." };
}

// ─── Contato ───────────────────────────────────────────────────────────
export type ContactInput = { name: string; email: string; phone: string; message: string; website?: string };

export async function sendContactMessage(input: ContactInput): Promise<{ ok: boolean; message: string }> {
  if (input.website) return { ok: false, message: "Não foi possível enviar." };

  const name = clean(input.name, 120);
  const email = clean(input.email, 160).toLowerCase();
  const phone = digits(input.phone).slice(0, 13);
  const message = clean(input.message, 2000);

  if (name.length < 2) return { ok: false, message: "Informe seu nome." };
  if (!isEmail(email)) return { ok: false, message: "Informe um e-mail válido." };
  if (message.length < 5) return { ok: false, message: "Escreva sua mensagem." };

  const db = createAdminClient();
  if (!db) return { ok: false, message: "Envio indisponível no momento. Fale conosco pelo WhatsApp." };
  if (!(await withinLimits(db, [
    { bucket: "contact-ip-h", key: await clientIp(), max: 4, windowSec: 3600 },
    { bucket: "contact-email-d", key: email, max: 4, windowSec: 86_400 },
  ]))) return { ok: false, message: TOO_MANY };

  const clientId = await upsertClient(db, { name, phone: phone.length >= 10 ? phone : "", email });
  if (!clientId) return { ok: false, message: "Não foi possível enviar. Tente novamente." };

  const { error } = await db.from("interactions").insert({
    client_id: clientId,
    kind: "mensagem_site",
    content: message,
    due_on: todaySP(),
  });
  if (error) return { ok: false, message: "Não foi possível enviar. Tente novamente." };
  return { ok: true, message: "Mensagem enviada." };
}

/** Escapa curingas do ILIKE (% _ \\) para a busca por e-mail ser exata, sem diferenciar maiúsculas. */
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Encontra a cliente pelo telefone (ou e-mail exato); senão cria como lead.
 * Formulário público não altera ficha existente: dados diferentes viram nota para a equipe conferir.
 */
async function upsertClient(db: Admin, c: { name: string; phone: string; email: string }) {
  type Found = { id: string; name: string; email: string | null; phone: string | null };
  let existing: Found | null = null;

  if (c.phone) {
    const { data } = await db.from("clients").select("id, name, email, phone").eq("phone", c.phone).maybeSingle();
    existing = data;
  }
  if (!existing && c.email) {
    const { data } = await db
      .from("clients").select("id, name, email, phone").ilike("email", likeExact(c.email)).order("created_at").limit(1).maybeSingle();
    existing = data;
  }

  if (existing) {
    // Achou pelo telefone: pode completar o e-mail que faltava. Achou só pelo e-mail: não mexe no telefone da ficha.
    const byPhone = Boolean(c.phone) && existing.phone === c.phone;
    if (byPhone && !existing.email && c.email) await db.from("clients").update({ email: c.email }).eq("id", existing.id);
    const diffs = [
      firstName(existing.name) !== firstName(c.name) && `nome "${c.name}"`,
      c.phone && !byPhone && `WhatsApp ${c.phone}`,
      c.email && existing.email && existing.email.toLowerCase() !== c.email && `e-mail ${c.email}`,
    ].filter(Boolean);
    if (diffs.length) {
      await db.from("interactions").insert({
        client_id: existing.id, kind: "nota", due_on: todaySP(),
        content: `Pedido pelo site com dados diferentes da ficha (${diffs.join(", ")}). Confira se é a mesma pessoa antes de confirmar ou enviar links.`,
      });
    }
    return existing.id;
  }

  const { data, error } = await db
    .from("clients")
    .insert({ name: c.name, phone: c.phone || null, email: c.email || null, source: "site", stage: "lead" })
    .select("id")
    .single();
  if (error) return null;
  return data.id as string;
}

const firstName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().split(/\s+/)[0];
