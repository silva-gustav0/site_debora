"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, withinLimits } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/types";

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Informe e-mail e senha." };

  // O Supabase só vê o IP do servidor; o limite por pessoa (IP) e por conta (e-mail) é feito aqui.
  const db = createAdminClient();
  if (db && !(await withinLimits(db, [
    { bucket: "login-ip", key: await clientIp(), max: 10, windowSec: 900 },
    { bucket: "login-email", key: email.toLowerCase(), max: 8, windowSec: 900 },
  ]))) return { ok: false, message: "Muitas tentativas. Aguarde 15 minutos e tente de novo." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "E-mail ou senha incorretos." };

  redirect("/painel");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/painel/login");
}
