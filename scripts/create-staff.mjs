// Cria (ou libera) uma conta da equipe para o painel.
// Uso: npm run staff -- email@exemplo.com "Nome" [senha]
// Sem senha: a conta já precisa existir (ex.: criada no painel do Supabase).
import { createClient } from "@supabase/supabase-js";

const [email, name, password] = process.argv.slice(2);
if (!email || !name) {
  console.error('Uso: npm run staff -- email@exemplo.com "Nome" [senha]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY em .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let userId;
if (password) {
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    console.error("Erro ao criar usuário:", error.message);
    process.exit(1);
  }
  userId = data.user.id;
} else {
  for (let page = 1; !userId; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (data.users.length < 200) break;
  }
  if (!userId) {
    console.error("Usuário não encontrado. Informe uma senha para criá-lo.");
    process.exit(1);
  }
}

const { error } = await db.from("staff").upsert({ user_id: userId, name });
if (error) {
  console.error("Erro ao liberar acesso:", error.message);
  process.exit(1);
}
console.log(`Pronto! ${name} <${email}> já pode entrar em /painel.`);
