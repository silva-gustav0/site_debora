"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { digits, firstName } from "@/lib/format";
import { clientIp, TOO_MANY, withinLimits } from "@/lib/rate-limit";
import { currentClient } from "@/lib/client-account";
import { WELCOME_PCT } from "@/lib/welcome";

// Conta da cliente no site: número + senha. O Supabase guarda a senha (com hash) num e-mail interno
// derivado do telefone; ninguém se cadastra direto no Supabase, só por aqui. Sem SMS por enquanto,
// então a conta só dá acesso a nome, telefone, desconto e agendamentos futuros (nada da ficha).

const MIN_PASSWORD = 8;

export type PhoneStatus = "nova" | "cliente" | "conta";
export type Account = {
  name: string; firstName: string; phone: string;
  discount: { pct: number; state: "disponivel" | "reservado" | "usado" } | null;
  upcoming: { token: string; service: string; startsAt: string; status: string; discountPct: number }[];
};
type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

/** Telefone só com DDD + número (tira o 55 do Brasil). */
const normPhone = (s: unknown) => {
  const d = digits(typeof s === "string" ? s : "");
  return d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
};
const validPhone = (p: string) => /^\d{10,11}$/.test(p);
const loginEmail = (phone: string) => `${phone}@clientes.deborasilvaestetica.com.br`;
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** Diz se o número é de cliente nova, de cliente sem conta (ex.: importada) ou de quem já tem conta. */
export async function checkPhone(raw: string): Promise<Result<{ status: PhoneStatus }>> {
  const phone = normPhone(raw);
  if (!validPhone(phone)) return { ok: false, message: "Informe o WhatsApp com DDD." };
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Cadastro indisponível no momento." };
  if (!(await withinLimits(db, [{ bucket: "conta-check-ip-h", key: await clientIp(), max: 40, windowSec: 3600 }]))) {
    return { ok: false, message: TOO_MANY };
  }
  const { data } = await db.from("clients").select("user_id").eq("phone", phone).maybeSingle();
  return { ok: true, status: !data ? "nova" : data.user_id ? "conta" : "cliente" };
}

/** Cria a conta (e a ficha, se for cliente nova, já com o desconto de boas-vindas) e entra. */
export async function registerAccount(input: { name: string; phone: string; password: string }): Promise<Result<{ isNew: boolean }>> {
  const phone = normPhone(input.phone);
  const name = clean(input.name, 120);
  if (!validPhone(phone)) return { ok: false, message: "Informe o WhatsApp com DDD." };
  if ((input.password ?? "").length < MIN_PASSWORD) return { ok: false, message: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` };
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Cadastro indisponível no momento." };
  if (!(await withinLimits(db, [
    { bucket: "conta-cadastro-ip-h", key: await clientIp(), max: 6, windowSec: 3600 },
    { bucket: "conta-cadastro-tel-d", key: phone, max: 5, windowSec: 86_400 },
  ]))) return { ok: false, message: TOO_MANY };

  const { data: existing } = await db.from("clients").select("id, user_id").eq("phone", phone).maybeSingle();
  if (existing?.user_id) return { ok: false, message: "Este número já tem cadastro. Entre com sua senha." };
  if (!existing && name.length < 3) return { ok: false, message: "Informe seu nome completo." };

  const { data: created, error } = await db.auth.admin.createUser({
    email: loginEmail(phone), password: input.password, email_confirm: true, user_metadata: { tipo: "cliente" },
  });
  if (error || !created.user) {
    const weak = /password/i.test(error?.message ?? "");
    return { ok: false, message: weak ? "Escolha uma senha mais forte (misture letras e números)." : "Não foi possível criar sua conta. Tente novamente." };
  }
  const userId = created.user.id;
  const link = existing
    ? await db.from("clients").update({ user_id: userId }).eq("id", existing.id).is("user_id", null)
    : await db.from("clients").insert({ name, phone, source: "site", stage: "lead", user_id: userId, welcome_discount_pct: WELCOME_PCT });
  if (link.error) {
    await db.auth.admin.deleteUser(userId);
    return { ok: false, message: "Não foi possível criar sua conta. Tente novamente." };
  }
  const supa = await createClient();
  await supa.auth.signInWithPassword({ email: loginEmail(phone), password: input.password });
  return { ok: true, isNew: !existing };
}

/** Entra com número e senha. */
export async function loginAccount(input: { phone: string; password: string }): Promise<Result> {
  const phone = normPhone(input.phone);
  if (!validPhone(phone) || !input.password) return { ok: false, message: "Informe o número e a senha." };
  const db = createAdminClient();
  if (!db) return { ok: false, message: "Entrada indisponível no momento." };
  if (!(await withinLimits(db, [
    { bucket: "conta-login-ip-h", key: await clientIp(), max: 15, windowSec: 3600 },
    { bucket: "conta-login-tel-h", key: phone, max: 8, windowSec: 3600 },
  ]))) return { ok: false, message: TOO_MANY };
  const supa = await createClient();
  const { error } = await supa.auth.signInWithPassword({ email: loginEmail(phone), password: input.password });
  return error ? { ok: false, message: "Número ou senha incorretos." } : { ok: true };
}

export async function logoutAccount() {
  const supa = await createClient();
  await supa.auth.signOut({ scope: "local" });
}

/** Dados da conta para o site: nome, desconto de boas-vindas e próximos agendamentos. */
export async function getMyAccount(): Promise<Account | null> {
  const c = await currentClient();
  const db = createAdminClient();
  if (!c || !db) return null;
  const { data } = await db.from("appointments")
    .select("public_token, starts_at, status, discount_pct, services(name)")
    .eq("client_id", c.id).order("starts_at", { ascending: false }).limit(50);
  const rows = data ?? [];
  const withDiscount = rows.filter((a) => Number(a.discount_pct) > 0);
  const discount = c.welcome_discount_pct > 0 ? {
    pct: c.welcome_discount_pct,
    state: withDiscount.some((a) => a.status === "concluido") ? "usado" as const
      : withDiscount.some((a) => ["solicitado", "confirmado"].includes(a.status)) ? "reservado" as const : "disponivel" as const,
  } : null;
  const now = Date.now();
  return {
    name: c.name, firstName: firstName(c.name), phone: c.phone, discount,
    upcoming: rows.filter((a) => ["solicitado", "confirmado"].includes(a.status) && Date.parse(a.starts_at) >= now).reverse().map((a) => ({
      token: a.public_token, startsAt: a.starts_at, status: a.status, discountPct: Number(a.discount_pct),
      service: (a.services as unknown as { name: string } | null)?.name ?? "Atendimento",
    })),
  };
}
