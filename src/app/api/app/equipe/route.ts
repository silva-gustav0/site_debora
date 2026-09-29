import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gestão da equipe pelo app Android (criar acesso, remover, tornar administradora).
 * Precisa da chave secreta, então fica no servidor. O app manda o token da sessão; aqui se confere
 * se a pessoa é administradora. Mesmas regras de Configurações → Equipe no painel web.
 */
type Body =
  | { action: "create"; name: string; email: string; password: string; is_admin?: boolean }
  | { action: "remove"; user_id: string }
  | { action: "set_admin"; user_id: string; is_admin: boolean };

const reply = (ok: boolean, message: string, status = ok ? 200 : 400) => Response.json({ ok, message }, { status });

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const admin = createAdminClient();
  if (!token || !url || !key || !admin) return reply(false, "Não autorizado.", 401);

  // Quem chama: token válido e administradora da equipe (consulta com o próprio token, sob RLS).
  const asUser = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: user } = await asUser.auth.getUser(token);
  const me = user.user?.id;
  if (!me) return reply(false, "Não autorizado.", 401);
  const { data: staff } = await asUser.from("staff").select("is_admin").eq("user_id", me).maybeSingle();
  if (!staff?.is_admin) return reply(false, "Só administradoras podem gerenciar acessos.", 403);

  const body = await req.json().catch(() => null) as Body | null;
  if (!body) return reply(false, "Pedido inválido.");

  if (body.action === "create") {
    const name = String(body.name ?? "").trim().slice(0, 80);
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 160);
    const password = String(body.password ?? "");
    if (name.length < 2 || !email.includes("@")) return reply(false, "Informe nome e e-mail.");
    if (password.length < 10) return reply(false, "A senha precisa ter ao menos 10 caracteres.");
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return reply(false, error.message.includes("already") ? "Já existe uma conta com esse e-mail." : "Não foi possível criar a conta.");
    const { error: staffErr } = await admin.from("staff").insert({ user_id: data.user.id, name, is_admin: Boolean(body.is_admin) });
    if (staffErr) {
      await admin.auth.admin.deleteUser(data.user.id);
      return reply(false, "Não foi possível liberar o acesso. Tente novamente.");
    }
    return reply(true, `${name} já pode entrar no painel.`);
  }

  const userId = String(("user_id" in body && body.user_id) || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return reply(false, "Pessoa inválida.");
  if (userId === me) return reply(false, "Você não pode alterar o seu próprio acesso.");

  if (body.action === "remove") {
    const { error } = await admin.auth.admin.deleteUser(userId);
    return error ? reply(false, "Não foi possível remover o acesso.") : reply(true, "Acesso removido.");
  }
  if (body.action === "set_admin") {
    const { error } = await admin.from("staff").update({ is_admin: Boolean(body.is_admin) }).eq("user_id", userId);
    return error ? reply(false, "Não foi possível alterar o papel.") : reply(true, "Papel atualizado.");
  }
  return reply(false, "Ação desconhecida.");
}
