"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin, requireStaff } from "@/lib/dal";
import { addDays, digits, SITE_URL, todaySP } from "@/lib/format";
import { anamnesisUpdate } from "@/lib/anamnesis";
import { DEFAULT_CONSENT, formOrDefault, sanitizeForm, type AnamnesisFormDef } from "@/lib/anamnesis-schema";
import { bool, fail, int, isDate, isTime, isUuid, money, opt, str } from "@/lib/form";
import { toTimestamp } from "@/lib/hours";
import { cardFee, getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_ICONS } from "@/lib/site-content";
import type { ActionState } from "@/lib/types";

// ─── helpers ───────────────────────────────────────────────────────────
const refresh = () => revalidatePath("/painel", "layout");
const done = (message: string): ActionState => {
  refresh();
  return { ok: true, message };
};

const STAGES = ["lead", "em_contato", "cliente", "vip", "inativa"];
const SOURCES = ["site", "instagram", "whatsapp", "indicacao", "passante", "outro"];
const METHODS = ["pix", "dinheiro", "credito", "debito", "transferencia", "outro"];
const KINDS = ["nota", "whatsapp", "ligacao", "followup"];
const STATUSES = ["solicitado", "confirmado", "cancelado", "faltou"];
const method = (fd: FormData) => (METHODS.includes(str(fd, "method")) ? str(fd, "method") : "pix");

/** Mensagem para a equipe; regras do banco (P0001) já vêm com o texto certo. */
function dbError(code: string | undefined, fallback: string, message?: string) {
  if (code === "P0001" && message) return message;
  if (code === "23505") return "Já existe um cadastro com esses dados (telefone ou nome repetido).";
  if (code === "23P01") return "Conflito de horário: já existe um atendimento nesse período.";
  if (code === "23503") return "Este item está em uso e não pode ser removido.";
  return fallback;
}

/** Chamada pelo painel quando o banco avisa de uma mudança: limpa as telas guardadas e redesenha a atual. */
export async function syncPanel() {
  await requireStaff();
  refresh();
}

// ─── Clientes ──────────────────────────────────────────────────────────
function clientFields(fd: FormData) {
  const phone = digits(str(fd, "phone", 30)).slice(0, 13);
  const stage = str(fd, "stage");
  const source = str(fd, "source");
  const birth = str(fd, "birth_date");
  return {
    name: str(fd, "name", 120),
    phone: phone || null,
    email: opt(fd, "email", 160)?.toLowerCase() ?? null,
    instagram: opt(fd, "instagram", 60),
    birth_date: isDate(birth) ? birth : null,
    cpf: digits(str(fd, "cpf", 20)) || null,
    address: opt(fd, "address", 200),
    occupation: opt(fd, "occupation", 80),
    stage: STAGES.includes(stage) ? stage : "lead",
    source: SOURCES.includes(source) ? source : "outro",
    tags: str(fd, "tags", 300).split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12),
    notes: opt(fd, "notes", 3000),
    marketing_opt_in: bool(fd, "marketing_opt_in"),
  };
}

export async function createClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const fields = clientFields(fd);
  if (fields.name.length < 2) return fail("Informe o nome da cliente.");

  const { data, error } = await supabase.from("clients").insert(fields).select("id").single();
  if (error) return fail(dbError(error.code, "Não foi possível salvar a cliente."));
  refresh();
  redirect(`/painel/clientes/${data.id}`);
}

export async function updateClientAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const fields = clientFields(fd);
  if (fields.name.length < 2) return fail("Informe o nome da cliente.");
  const { error } = await supabase.from("clients").update(fields).eq("id", str(fd, "id"));
  if (error) return fail(dbError(error.code, "Não foi possível salvar as alterações."));
  return done("Dados salvos.");
}

export async function saveAnamnesis(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  const [settings, { data: prev }] = await Promise.all([
    getSettings(supabase),
    supabase.from("clients").select("anamnesis").eq("id", id).maybeSingle(),
  ]);
  const { error } = await supabase.from("clients")
    .update(anamnesisUpdate(fd, "equipe", formOrDefault(settings.anamnesis_form), prev?.anamnesis ?? null)).eq("id", id);
  if (error) return fail("Não foi possível salvar a anamnese.");
  return done("Anamnese salva.");
}

export type AnamnesisLinkResult = { ok: true; url: string; expiresAt: string } | { ok: false; message: string };

/** Gera um link único de anamnese (2 h) para o cliente do agendamento e invalida os links anteriores dele. */
export async function createAnamnesisLink(appointmentId: string): Promise<AnamnesisLinkResult> {
  const { supabase } = await requireStaff();
  const { data: appt } = await supabase.from("appointments").select("id, client_id").eq("id", appointmentId).maybeSingle();
  if (!appt?.client_id) return { ok: false, message: "Agendamento sem cliente." };
  await supabase.from("anamnesis_links").update({ revoked_at: new Date().toISOString() })
    .eq("appointment_id", appt.id).is("revoked_at", null);
  const { data, error } = await supabase.from("anamnesis_links")
    .insert({ appointment_id: appt.id, client_id: appt.client_id }).select("token, expires_at").single();
  if (error) return { ok: false, message: "Não foi possível gerar o link. A migração do banco já foi aplicada?" };
  refresh();
  return { ok: true, url: `${SITE_URL}/anamnese/${data.token}`, expiresAt: data.expires_at };
}

export async function setConsent(fd: FormData) {
  const { supabase } = await requireStaff();
  const signed = str(fd, "signed") === "1";
  await supabase.from("clients").update({ consent_signed_at: signed ? new Date().toISOString() : null }).eq("id", str(fd, "id"));
  refresh();
}

export async function deleteClientAction(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  const { data: photos } = await supabase.from("client_photos").select("path").eq("client_id", id);
  if (photos?.length) await supabase.storage.from("client-photos").remove(photos.map((p) => p.path));
  await removeSiteAccount(supabase, id);
  await supabase.from("clients").delete().eq("id", id);
  refresh();
  redirect("/painel/clientes");
}

/** Apaga a conta do site ligada à ficha (a ficha continua); o número fica livre para um novo cadastro. */
async function removeSiteAccount(supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"], clientId: string) {
  const { data } = await supabase.from("clients").select("user_id").eq("id", clientId).maybeSingle();
  // Só contas de cliente: nunca apaga login da equipe.
  const { data: isStaff } = data?.user_id ? await supabase.from("staff").select("user_id").eq("user_id", data.user_id).maybeSingle() : { data: null };
  if (data?.user_id && !isStaff) await createAdminClient()?.auth.admin.deleteUser(data.user_id);
}

/** Painel: a cliente esqueceu a senha do site; remove a conta para ela se cadastrar de novo com o mesmo número. */
export async function resetSiteAccess(fd: FormData) {
  const { supabase } = await requireStaff();
  await removeSiteAccount(supabase, str(fd, "id"));
  refresh();
}

export async function setClientStage(fd: FormData) {
  const { supabase } = await requireStaff();
  const stage = str(fd, "stage");
  if (!STAGES.includes(stage)) return;
  await supabase.from("clients").update({ stage }).eq("id", str(fd, "id"));
  refresh();
}

// ─── Prontuário: evolução e fotos ──────────────────────────────────────
export async function addSessionRecord(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const procedure = str(fd, "procedure", 200);
  const date = str(fd, "record_date");
  if (!procedure) return fail("Informe o procedimento realizado.");
  const { error } = await supabase.from("session_records").insert({
    client_id: str(fd, "client_id"),
    appointment_id: opt(fd, "appointment_id"),
    record_date: isDate(date) ? date : todaySP(),
    procedure,
    products_used: opt(fd, "products_used", 1000),
    parameters: opt(fd, "parameters", 1000),
    observations: opt(fd, "observations", 3000),
    next_steps: opt(fd, "next_steps", 1000),
  });
  if (error) return fail("Não foi possível salvar a evolução.");
  return done("Evolução registrada no prontuário.");
}

export async function deleteSessionRecord(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("session_records").delete().eq("id", str(fd, "id"));
  refresh();
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

export async function uploadPhoto(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const clientId = str(fd, "client_id");
  const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const kind = ["antes", "depois", "evolucao"].includes(str(fd, "kind")) ? str(fd, "kind") : "evolucao";
  const date = str(fd, "taken_on");
  if (!isUuid(clientId)) return fail("Cliente inválida.");
  if (!files.length) return fail("Selecione ao menos uma foto.");

  for (const file of files.slice(0, 6)) {
    const ext = PHOTO_TYPES[file.type];
    if (!ext) return fail(`Formato não suportado: ${file.name}. Use JPG, PNG, WEBP ou HEIC.`);
    if (file.size > 8 * 1024 * 1024) return fail(`${file.name} passa de 8 MB.`);
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("client-photos").upload(path, file, { contentType: file.type });
    if (upErr) return fail("Não foi possível enviar a foto.");
    const { error } = await supabase.from("client_photos").insert({
      client_id: clientId, path, kind, taken_on: isDate(date) ? date : todaySP(), caption: opt(fd, "caption", 200),
    });
    if (error) return fail("Foto enviada, mas não foi registrada.");
  }
  return done(files.length > 1 ? `${Math.min(files.length, 6)} fotos enviadas.` : "Foto enviada.");
}

export async function deletePhoto(fd: FormData) {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("client_photos").select("path").eq("id", str(fd, "id")).maybeSingle();
  if (data) await supabase.storage.from("client-photos").remove([data.path]);
  await supabase.from("client_photos").delete().eq("id", str(fd, "id"));
  refresh();
}

// ─── Agenda ────────────────────────────────────────────────────────────
export async function createAppointment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();

  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!isDate(date) || !isTime(time)) return fail("Informe data e horário.");

  const { data: service } = await supabase
    .from("services").select("id, duration_min, price").eq("id", str(fd, "service_id")).maybeSingle();
  if (!service) return fail("Escolha um serviço.");

  let clientId = str(fd, "client_id");
  if (!clientId || clientId === "__novo") {
    const name = str(fd, "new_name", 120);
    const phone = digits(str(fd, "new_phone", 30)).slice(0, 13) || null;
    if (name.length < 2) return fail("Escolha uma cliente ou informe o nome da nova cliente.");
    const { data: created, error } = await supabase
      .from("clients").insert({ name, phone, stage: "em_contato", source: "whatsapp" }).select("id").single();
    if (error) return fail(dbError(error.code, "Não foi possível cadastrar a cliente."));
    clientId = created.id;
  }

  // Sessão de pacote: o banco confere se o pacote é da cliente, do serviço e tem saldo.
  const packageId = opt(fd, "client_package_id");

  const duration = int(fd, "duration") || service.duration_min;
  const price = money(fd, "price");
  const startsAt = toTimestamp(date, time);
  const endsAt = new Date(Date.parse(startsAt) + duration * 60_000).toISOString();
  const status = str(fd, "status") === "solicitado" ? "solicitado" : "confirmado";

  const { error } = await supabase.from("appointments").insert({
    client_id: clientId,
    service_id: service.id,
    starts_at: startsAt,
    ends_at: endsAt,
    price: packageId ? 0 : Number.isFinite(price) ? price : service.price,
    notes: opt(fd, "notes", 1000),
    status,
    confirmed_at: status === "confirmado" ? new Date().toISOString() : null,
    client_package_id: packageId,
    source: "painel",
  });
  if (error) return fail(dbError(error.code, "Não foi possível criar o agendamento.", error.message));
  return done("Agendamento criado.");
}

export async function setAppointmentStatus(fd: FormData) {
  const { supabase } = await requireStaff();
  const status = str(fd, "status");
  if (!STATUSES.includes(status)) return;
  const patch: Record<string, unknown> = { status };
  if (status === "confirmado") patch.confirmed_at = new Date().toISOString();
  if (status === "cancelado") patch.cancel_reason = opt(fd, "reason", 300) ?? "Cancelado pela clínica";
  await supabase.from("appointments").update(patch).eq("id", str(fd, "id"));
  refresh();
}

export async function markReminderSent(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", str(fd, "id"));
  refresh();
}

/** Conclui o atendimento; opcionalmente registra pagamento (com taxa) e evolução. */
export async function completeAppointment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, client_package_id, price, voucher_id, voucher_amount, services(name), vouchers(id, code, kind, balance)")
    .eq("id", id).maybeSingle();
  if (!appt) return fail("Atendimento não encontrado.");
  const serviceName = (appt.services as unknown as { name: string } | null)?.name ?? "Atendimento";

  // Voucher: a venda já entrou no financeiro. O banco desconta o saldo (uma vez) ao concluir; aqui só se cobra a diferença.
  const voucher = appt.vouchers as unknown as { id: string; code: string; kind: "servico" | "valor"; balance: number } | null;
  const price = Number(appt.price);
  const covered = !voucher ? 0
    : appt.voucher_amount !== null ? Number(appt.voucher_amount)
    : voucher.kind === "servico" ? price : Math.min(Number(voucher.balance), price);
  const due = Math.max(0, Math.round((price - covered) * 100) / 100);

  const register = bool(fd, "register_payment") && !(voucher && due === 0);
  const amount = money(fd, "amount");
  if (register && (!Number.isFinite(amount) || amount <= 0)) return fail("Informe o valor recebido.");

  // O banco cuida do resto ao concluir: saldo do voucher, estágio da cliente e pacote encerrado.
  // Só conclui o que ainda está aberto (dois cliques ou dois aparelhos não registram o pagamento duas vezes).
  const patch: Record<string, unknown> = { status: "concluido" };
  if (register && !voucher) patch.price = amount;
  const { data: updated, error } = await supabase.from("appointments").update(patch)
    .eq("id", id).neq("status", "concluido").select("id");
  if (error) return fail(dbError(error.code, "Não foi possível concluir o atendimento.", error.message));
  if (!updated?.length) return fail("Este atendimento já foi concluído.");

  if (register) {
    const settings = await getSettings(supabase);
    const m = method(fd);
    const { error: txError } = await supabase.from("transactions").insert({
      kind: "receita", category: "Atendimento", description: voucher ? `${serviceName} (diferença do voucher ${voucher.code})` : serviceName, amount, method: m,
      fee: cardFee(settings, m, amount), occurred_on: todaySP(), status: "pago",
      client_id: appt.client_id, appointment_id: appt.id,
    });
    if (txError) return fail("Atendimento concluído, mas o pagamento não foi registrado.");
  }

  // Evolução para o prontuário (a tela de atendimento envia também produtos, parâmetros e orientações).
  const note = str(fd, "record_note", 3000);
  const record = {
    products_used: opt(fd, "products_used", 1000), parameters: opt(fd, "parameters", 1000), next_steps: opt(fd, "next_steps", 1000),
  };
  if (note || record.products_used || record.parameters || record.next_steps) {
    await supabase.from("session_records").insert({
      client_id: appt.client_id, appointment_id: appt.id, procedure: serviceName, observations: note || null, ...record,
    });
  }

  if (voucher && !register) return done(`Atendimento concluído. Pago com o voucher ${voucher.code}.`);
  return done(register ? "Atendimento concluído e pagamento registrado." : "Atendimento concluído.");
}

export async function rescheduleAppointment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!isDate(date) || !isTime(time)) return fail("Informe a nova data e horário.");

  const { data: appt } = await supabase.from("appointments").select("starts_at, ends_at").eq("id", id).maybeSingle();
  if (!appt) return fail("Atendimento não encontrado.");

  const duration = Date.parse(appt.ends_at) - Date.parse(appt.starts_at);
  const startsAt = toTimestamp(date, time);
  const endsAt = new Date(Date.parse(startsAt) + duration).toISOString();
  const { error } = await supabase
    .from("appointments").update({ starts_at: startsAt, ends_at: endsAt, reminder_sent_at: null }).eq("id", id);
  if (error) return fail(dbError(error.code, "Não foi possível remarcar."));
  return done("Atendimento remarcado.");
}

export async function createBlock(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const from = str(fd, "date");
  const to = str(fd, "date_end") || from;
  const allDay = bool(fd, "all_day");
  const start = allDay ? "00:00" : str(fd, "start");
  const end = allDay ? "23:59" : str(fd, "end");
  if (!isDate(from) || !isDate(to) || to < from) return fail("Informe as datas do bloqueio.");
  if (!isTime(start) || !isTime(end)) return fail("Informe o horário do bloqueio.");

  const rows = [];
  for (let d = from; d <= to && rows.length < 60; d = addDays(d, 1)) {
    const s = toTimestamp(d, start);
    const e = toTimestamp(d, end);
    if (Date.parse(e) <= Date.parse(s)) return fail("O fim precisa ser depois do início.");
    rows.push({ starts_at: s, ends_at: e, reason: str(fd, "reason", 120) || "Bloqueado" });
  }
  const { error } = await supabase.from("time_blocks").insert(rows);
  if (error) return fail("Não foi possível bloquear a agenda.");
  return done(rows.length > 1 ? `${rows.length} dias bloqueados.` : "Horário bloqueado.");
}

export async function deleteBlock(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("time_blocks").delete().eq("id", str(fd, "id"));
  refresh();
}

// ─── Pacotes ───────────────────────────────────────────────────────────
export async function savePackage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = opt(fd, "id");
  const row = {
    name: str(fd, "name", 120),
    service_id: str(fd, "service_id"),
    sessions: int(fd, "sessions"),
    price: money(fd, "price"),
    validity_days: int(fd, "validity_days") > 0 ? int(fd, "validity_days") : null,
    active: bool(fd, "active"),
  };
  if (row.name.length < 2) return fail("Informe o nome do pacote.");
  if (!(row.sessions >= 1 && row.sessions <= 100)) return fail("Número de sessões entre 1 e 100.");
  if (!Number.isFinite(row.price) || row.price < 0) return fail("Informe o preço.");
  const { error } = id
    ? await supabase.from("packages").update(row).eq("id", id)
    : await supabase.from("packages").insert(row);
  if (error) return fail(dbError(error.code, "Não foi possível salvar o pacote."));
  return done(id ? "Pacote atualizado." : "Pacote criado.");
}

/** Vende um pacote: cria o saldo de sessões e os lançamentos (à vista ou parcelado a receber). */
export async function sellPackage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const clientId = str(fd, "client_id");
  const { data: pkg } = await supabase.from("packages").select("*").eq("id", str(fd, "package_id")).maybeSingle();
  if (!isUuid(clientId)) return fail("Escolha a cliente.");
  if (!pkg) return fail("Escolha o pacote.");

  const price = Number.isFinite(money(fd, "price")) ? money(fd, "price") : Number(pkg.price);
  const purchased = isDate(str(fd, "purchased_on")) ? str(fd, "purchased_on") : todaySP();
  const installments = Math.min(Math.max(int(fd, "installments") || 1, 1), 12);
  const paidNow = str(fd, "payment") !== "pendente";
  const m = method(fd);

  const { data: cp, error } = await supabase.from("client_packages").insert({
    client_id: clientId, package_id: pkg.id, service_id: pkg.service_id, name: pkg.name,
    sessions_total: pkg.sessions, price, purchased_on: purchased,
    expires_on: pkg.validity_days ? addDays(purchased, pkg.validity_days) : null,
    notes: opt(fd, "notes", 500),
  }).select("id").single();
  if (error) return fail("Não foi possível registrar a venda.");

  if (price > 0) {
    const settings = await getSettings(supabase);
    const per = Math.floor((price / installments) * 100) / 100;
    const rows = Array.from({ length: installments }, (_, i) => {
      const amount = i === installments - 1 ? Math.round((price - per * (installments - 1)) * 100) / 100 : per;
      const due = addDays(purchased, 30 * i);
      const paid = paidNow && (i === 0 || m === "credito");
      return {
        kind: "receita", category: "Pacotes",
        description: `${pkg.name}${installments > 1 ? ` (${i + 1}/${installments})` : ""}`,
        amount, method: m, fee: paid ? cardFee(settings, m, amount) : 0,
        status: paid ? "pago" : "pendente", occurred_on: paid ? purchased : due, due_on: due,
        client_id: clientId, client_package_id: cp.id,
      };
    });
    const { error: txErr } = await supabase.from("transactions").insert(rows);
    if (txErr) return fail("Pacote registrado, mas os lançamentos financeiros falharam.");
  }

  return done("Pacote vendido.");
}

export async function setClientPackageStatus(fd: FormData) {
  const { supabase } = await requireStaff();
  const status = str(fd, "status");
  if (!["ativo", "concluido", "expirado", "cancelado"].includes(status)) return;
  await supabase.from("client_packages").update({ status }).eq("id", str(fd, "id"));
  refresh();
}

// ─── Estoque ───────────────────────────────────────────────────────────
export async function saveProduct(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = opt(fd, "id");
  const row = {
    name: str(fd, "name", 120),
    brand: opt(fd, "brand", 80),
    category: str(fd, "category") === "home_care" ? "home_care" : "uso_cabine",
    unit: str(fd, "unit", 12) || "un",
    min_qty: Math.max(money(fd, "min_qty") || 0, 0),
    cost_price: Math.max(money(fd, "cost_price") || 0, 0),
    sale_price: Math.max(money(fd, "sale_price") || 0, 0),
    active: id ? bool(fd, "active") : true,
  };
  if (row.name.length < 2) return fail("Informe o nome do produto.");

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return fail("Não foi possível salvar o produto.");
    return done("Produto atualizado.");
  }
  const { data, error } = await supabase.from("products").insert(row).select("id").single();
  if (error) return fail("Não foi possível cadastrar o produto.");
  const initial = money(fd, "initial_qty");
  if (Number.isFinite(initial) && initial > 0) {
    await supabase.from("stock_movements").insert({ product_id: data.id, kind: "entrada", qty: initial, unit_cost: row.cost_price, note: "Estoque inicial" });
  }
  return done("Produto cadastrado.");
}

export async function addStockMovement(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const kind = str(fd, "kind");
  const productId = str(fd, "product_id");
  const qty = money(fd, "qty");
  if (!["entrada", "saida", "venda", "ajuste"].includes(kind)) return fail("Tipo inválido.");
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
  if (!product) return fail("Produto não encontrado.");
  if (!Number.isFinite(qty) || (kind !== "ajuste" && qty <= 0) || (kind === "ajuste" && qty < 0)) return fail("Informe a quantidade.");

  const delta = kind === "entrada" ? qty : kind === "ajuste" ? qty - Number(product.stock_qty) : -qty;
  if (delta === 0) return fail("O estoque já está com essa quantidade.");
  const unitCost = money(fd, "unit_cost");
  const clientId = opt(fd, "client_id");

  const { data: mov, error } = await supabase.from("stock_movements").insert({
    product_id: productId, kind, qty: delta,
    unit_cost: Number.isFinite(unitCost) ? unitCost : null,
    note: opt(fd, "note", 300), client_id: clientId,
  }).select("id").single();
  if (error) return fail("Não foi possível registrar a movimentação.");

  const settings = await getSettings(supabase);
  if (kind === "entrada" && Number.isFinite(unitCost) && unitCost > 0) {
    await supabase.from("products").update({ cost_price: unitCost }).eq("id", productId);
    if (bool(fd, "register_expense")) {
      await supabase.from("transactions").insert({
        kind: "despesa", category: "Produtos e insumos", description: `Compra: ${product.name}`,
        amount: Math.round(unitCost * qty * 100) / 100, method: method(fd), occurred_on: todaySP(),
        status: "pago", stock_movement_id: mov.id,
      });
    }
  }
  if (kind === "venda") {
    const unitPrice = Number.isFinite(money(fd, "unit_price")) ? money(fd, "unit_price") : Number(product.sale_price);
    const amount = Math.round(unitPrice * qty * 100) / 100;
    if (amount > 0) {
      const m = method(fd);
      await supabase.from("transactions").insert({
        kind: "receita", category: "Venda de produtos", description: `${qty}× ${product.name}`,
        amount, method: m, fee: cardFee(settings, m, amount), occurred_on: todaySP(), status: "pago",
        client_id: clientId, stock_movement_id: mov.id,
      });
    }
  }
  return done("Movimentação registrada.");
}

export async function deleteStockMovement(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("stock_movements").delete().eq("id", str(fd, "id"));
  refresh();
}

// ─── Financeiro ────────────────────────────────────────────────────────
export async function createTransaction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const kind = str(fd, "kind") === "despesa" ? "despesa" : "receita";
  const amount = money(fd, "amount");
  const date = str(fd, "occurred_on");
  const pending = str(fd, "status") === "pendente";
  const installments = Math.min(Math.max(int(fd, "installments") || 1, 1), 24);
  if (!Number.isFinite(amount) || amount <= 0) return fail("Informe um valor válido.");
  if (!isDate(date)) return fail("Informe a data.");

  const settings = await getSettings(supabase);
  const m = method(fd);
  const per = Math.floor((amount / installments) * 100) / 100;
  const description = opt(fd, "description", 200);
  const rows = Array.from({ length: installments }, (_, i) => {
    const value = i === installments - 1 ? Math.round((amount - per * (installments - 1)) * 100) / 100 : per;
    const due = addDays(date, 30 * i);
    const isPaid = !pending && i === 0;
    return {
      kind, amount: value, method: m,
      fee: kind === "receita" && isPaid ? cardFee(settings, m, value) : 0,
      status: isPaid ? "pago" : "pendente",
      occurred_on: due, due_on: isPaid ? null : due,
      category: str(fd, "category", 60) || (kind === "receita" ? "Atendimento" : "Outros"),
      description: installments > 1 ? `${description ?? "Parcela"} (${i + 1}/${installments})` : description,
      client_id: opt(fd, "client_id"),
      appointment_id: opt(fd, "appointment_id"),
    };
  });
  const { error } = await supabase.from("transactions").insert(rows);
  if (error) return fail("Não foi possível registrar o lançamento.");
  return done(installments > 1 ? `${installments} parcelas lançadas.` : kind === "receita" ? "Receita registrada." : "Despesa registrada.");
}

export async function markTransactionPaid(fd: FormData) {
  const { supabase } = await requireStaff();
  const { data: tx } = await supabase.from("transactions").select("kind, amount, method").eq("id", str(fd, "id")).maybeSingle();
  if (!tx) return;
  const settings = await getSettings(supabase);
  await supabase.from("transactions").update({
    status: "pago", occurred_on: todaySP(),
    fee: tx.kind === "receita" ? cardFee(settings, tx.method, Number(tx.amount)) : 0,
  }).eq("id", str(fd, "id"));
  refresh();
}

export async function deleteTransaction(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("transactions").delete().eq("id", str(fd, "id"));
  refresh();
}

// ─── CRM ───────────────────────────────────────────────────────────────
export async function addInteraction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const kind = str(fd, "kind");
  const content = str(fd, "content", 2000);
  const due = str(fd, "due_on");
  if (!content) return fail("Escreva a anotação.");
  const { error } = await supabase.from("interactions").insert({
    client_id: str(fd, "client_id"), kind: KINDS.includes(kind) ? kind : "nota", content, due_on: isDate(due) ? due : null,
  });
  if (error) return fail("Não foi possível salvar.");
  return done(isDate(due) ? "Lembrete agendado." : "Anotação salva.");
}

export async function completeInteraction(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("interactions").update({ done_at: new Date().toISOString() }).eq("id", str(fd, "id"));
  refresh();
}

export async function deleteInteraction(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("interactions").delete().eq("id", str(fd, "id"));
  refresh();
}

/** Registra que a cliente foi contatada (retorno, campanha, aniversário…). */
export async function logContact(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("interactions").insert({
    client_id: str(fd, "client_id"), kind: "whatsapp",
    content: str(fd, "content", 500) || "Mensagem enviada pelo WhatsApp.",
  });
  refresh();
}

// ─── Serviços ──────────────────────────────────────────────────────────
export async function saveService(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const isNew = !str(fd, "id");
  const name = str(fd, "name", 120);
  const price = money(fd, "price");
  const duration = int(fd, "duration_min");
  const returnDays = int(fd, "return_days");
  const category = str(fd, "category");
  if (name.length < 2) return fail("Informe o nome do serviço.");
  if (!Number.isFinite(price) || price < 0) return fail("Informe um preço válido.");
  if (!(duration >= 15 && duration <= 480)) return fail("Duração entre 15 e 480 minutos.");

  // Compara nomes ignorando acentos/maiúsculas; o id é um apelido interno e ganha sufixo se já estiver em uso (ex.: serviço renomeado).
  const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55);
  const { data: existing, error: listError } = await supabase.from("services").select("id, name");
  if (listError) return fail("Não foi possível conferir os serviços. Tente de novo.");
  if (existing!.some((s) => s.id !== str(fd, "id") && slug(s.name) === slug(name))) return fail(`Já existe um serviço chamado “${name}”.`);
  const base = slug(name) || "servico", ids = new Set(existing!.map((s) => s.id));
  let id = isNew ? base : str(fd, "id");
  for (let n = 2; isNew && ids.has(id); n++) id = `${base}-${n}`;
  const row = {
    id, name, price, duration_min: duration,
    return_days: returnDays > 0 ? returnDays : null,
    category: ["facial", "corporal", "terapias", "combo"].includes(category) ? category : "facial",
    description: opt(fd, "description", 500),
    active: bool(fd, "active"),
    show_on_home: bool(fd, "show_on_home"),
    icon: str(fd, "icon") in SERVICE_ICONS ? str(fd, "icon") : "sparkles",
  };
  const { error } = isNew
    ? await supabase.from("services").insert({ ...row, sort_order: 99 })
    : await supabase.from("services").update(row).eq("id", id);
  if (error) return fail("Não foi possível salvar o serviço.");
  revalidatePath("/", "layout");
  return done(isNew ? "Serviço criado." : "Serviço atualizado.");
}

/** Exclui o serviço; se já tiver agendamentos ou pacotes, o banco impede para não perder o histórico. */
export async function deleteService(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const { error } = await supabase.from("services").delete().eq("id", str(fd, "id"));
  if (error?.code === "23503") return fail("Este serviço já tem agendamentos ou pacotes no histórico e não pode ser excluído. Desmarque “Disponível no site” para escondê-lo.");
  if (error) return fail("Não foi possível excluir o serviço.");
  revalidatePath("/", "layout");
  return done("Serviço excluído.");
}

// ─── Configurações ─────────────────────────────────────────────────────
export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const hours: Record<string, unknown> = {};
  for (let d = 0; d <= 6; d++) {
    if (!bool(fd, `open_day_${d}`)) { hours[d] = null; continue; }
    const open = str(fd, `open_${d}`), close = str(fd, `close_${d}`);
    const bs = str(fd, `break_start_${d}`), be = str(fd, `break_end_${d}`);
    if (!isTime(open) || !isTime(close) || close <= open) return fail("Confira os horários de abertura e fechamento.");
    const hasBreak = isTime(bs) && isTime(be) && be > bs;
    hours[d] = { open, close, break_start: hasBreak ? bs : null, break_end: hasBreak ? be : null };
  }
  const row = {
    clinic_name: str(fd, "clinic_name", 120) || "Clínica Débora Silva",
    whatsapp: digits(str(fd, "whatsapp", 20)),
    address: str(fd, "address", 200),
    business_hours: hours,
    slot_step_min: [15, 20, 30, 60].includes(int(fd, "slot_step_min")) ? int(fd, "slot_step_min") : 30,
    min_lead_min: Math.max(int(fd, "min_lead_min") || 0, 0),
    max_days_ahead: Math.min(Math.max(int(fd, "max_days_ahead") || 90, 1), 365),
    cancel_min_hours: Math.max(int(fd, "cancel_min_hours") || 0, 0),
    fee_credit: Math.min(Math.max(money(fd, "fee_credit") || 0, 0), 30),
    fee_debit: Math.min(Math.max(money(fd, "fee_debit") || 0, 0), 30),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("settings").update(row).eq("id", 1);
  if (error) return fail("Não foi possível salvar as configurações.");
  revalidatePath("/", "page");
  return done("Configurações salvas.");
}

/** Salva o modelo da ficha de anamnese e o texto do termo ("padrao" volta ao modelo original). */
export async function saveAnamnesisModel(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const reset = str(fd, "reset") === "1";
  let form: AnamnesisFormDef | null = null;
  if (!reset) {
    try { form = sanitizeForm(JSON.parse(str(fd, "form", 200_000))); } catch { form = null; }
    if (!form) return fail("A ficha precisa de pelo menos uma pergunta com nome (e opções, quando for de escolha).");
  }
  const consent = reset ? "" : str(fd, "consent", 8000);
  const { error } = await supabase.from("settings").update({
    anamnesis_form: reset ? null : form,
    consent_text: consent && consent !== DEFAULT_CONSENT ? consent : null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) return fail("Não foi possível salvar a ficha.");
  return done(reset ? "Ficha e termo voltaram ao modelo original." : "Ficha e termo salvos. As próximas fichas já usam este modelo.");
}

export async function saveTemplates(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const keys = ["confirmacao", "lembrete", "pos_atendimento", "retorno", "reativacao", "aniversario"];
  const templates = Object.fromEntries(keys.map((k) => [k, str(fd, k, 1000)]).filter(([, v]) => v));
  const { error } = await supabase.from("settings").update({ templates, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return fail("Não foi possível salvar as mensagens.");
  return done("Mensagens salvas.");
}

/** Cria o login de uma nova pessoa da equipe (usa a chave secreta no servidor). */
export async function createStaffMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await requireAdmin())) return fail("Só administradoras podem dar acesso ao painel.");
  const admin = createAdminClient();
  if (!admin) return fail("Configure SUPABASE_SECRET_KEY para cadastrar a equipe.");
  const name = str(fd, "name", 80);
  const email = str(fd, "email", 160).toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (name.length < 2 || !email.includes("@")) return fail("Informe nome e e-mail.");
  if (password.length < 10) return fail("A senha precisa ter ao menos 10 caracteres.");

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) return fail(error.message.includes("already") ? "Já existe uma conta com esse e-mail." : "Não foi possível criar a conta.");
  const { error: staffErr } = await admin.from("staff").insert({ user_id: data.user.id, name, is_admin: bool(fd, "is_admin") });
  if (staffErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return fail("Não foi possível liberar o acesso. Tente novamente.");
  }
  refresh();
  return done(`${name} já pode entrar no painel.`);
}

/** Tira o acesso de alguém da equipe (apaga a conta; a sessão aberta perde a permissão na hora). */
export async function removeStaffMember(fd: FormData) {
  const me = await requireAdmin();
  const admin = createAdminClient();
  const userId = str(fd, "user_id");
  if (!me || !admin || !userId || userId === me.userId) return;
  await admin.auth.admin.deleteUser(userId);
  refresh();
}

/** Dá ou tira o papel de administradora (sem mexer no próprio papel, para nunca ficar sem nenhuma). */
export async function setStaffAdmin(fd: FormData) {
  const me = await requireAdmin();
  const admin = createAdminClient();
  const userId = str(fd, "user_id");
  if (!me || !admin || !userId || userId === me.userId) return;
  await admin.from("staff").update({ is_admin: str(fd, "is_admin") === "1" }).eq("user_id", userId);
  refresh();
}

export async function changeOwnPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireStaff();
  const password = String(fd.get("password") ?? "");
  if (password.length < 10) return fail("A nova senha precisa ter ao menos 10 caracteres.");
  if (password !== String(fd.get("confirm") ?? "")) return fail("As senhas não conferem.");

  // Confirma a senha atual (quem pegar uma sessão aberta não consegue trocar a senha e tomar a conta).
  const { data: user } = await supabase.auth.getUser();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!user.user?.email || !url || !key) return fail("Não foi possível alterar a senha.");
  const check = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: wrong } = await check.auth.signInWithPassword({ email: user.user.email, password: String(fd.get("current") ?? "") });
  if (wrong || signed.user?.id !== userId) return fail("A senha atual está incorreta.");
  await check.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.message.includes("weak") || error.message.includes("pwned") ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra." : "Não foi possível alterar a senha.");
  return { ok: true, message: "Senha alterada." };
}
