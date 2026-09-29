import "server-only";
import { createHash } from "crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** IP de quem chamou (Cloudflare envia cf-connecting-ip; fora dele, o primeiro item de x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "").trim() || "desconhecido";
}

// O sal vem da chave secreta: o hash não pode ser revertido para o IP/telefone por quem só vê o banco.
const hash = (s: string) => createHash("sha256").update(`${process.env.SUPABASE_SECRET_KEY ?? ""}:${s}`).digest("hex");

export type Limit = { bucket: string; key: string; max: number; windowSec: number };

/**
 * Registra uma tentativa e diz se ainda está dentro do limite de todas as regras.
 * Em caso de erro no banco, deixa passar (o formulário não pode parar por causa do limitador).
 */
export async function withinLimits(db: SupabaseClient, limits: Limit[]): Promise<boolean> {
  const rows = limits.map((l) => ({ bucket: l.bucket, key_hash: hash(l.key) }));
  const counts = await Promise.all(limits.map((l, i) =>
    db.from("rate_events").select("id", { count: "exact", head: true })
      .eq("bucket", l.bucket).eq("key_hash", rows[i].key_hash)
      .gte("created_at", new Date(Date.now() - l.windowSec * 1000).toISOString()),
  ));
  if (counts.some((c, i) => !c.error && (c.count ?? 0) >= limits[i].max)) return false;
  await db.from("rate_events").insert(rows);
  // Limpeza ocasional do que já passou de 2 dias.
  if (Math.random() < 0.02) {
    await db.from("rate_events").delete().lt("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
  }
  return true;
}

export const TOO_MANY = "Muitas tentativas em pouco tempo. Aguarde um pouco ou fale conosco pelo WhatsApp.";
