import { useQuery } from "@powersync/react-native";
import { fmtDate } from "@shared/format";
import { Fragment, useState } from "react";
import { Avatar, Badge, Button, Card, ConfirmButton, Field, ListItem, Row, Screen, Toggle, Txt, useToast } from "@/components/ui";
import { asBool, SITE_URL, useMe } from "@/db/hooks";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

type Person = { id: string; name: string; is_admin: number; created_at: string };

/** Pessoas com acesso ao painel: administradoras dão e tiram acessos (online); qualquer pessoa troca a própria senha. */
export default function Equipe() {
  const toast = useToast();
  const me = useMe();
  const { session } = useSession();
  const { data } = useQuery<Person>("select id, name, is_admin, created_at from staff order by created_at");
  const [novo, setNovo] = useState({ name: "", email: "", password: "", is_admin: false });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  // Chamada online ao servidor (precisa de internet); mostra a resposta.
  const call = async (body: object) => {
    try {
      const r = await fetch(`${SITE_URL}/api/app/equipe`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify(body),
      });
      const j = (await r.json()) as { ok: boolean; message: string };
      toast(j.message, j.ok ? "ok" : "error");
      return j.ok;
    } catch {
      toast("Sem internet. Conecte-se para gerenciar a equipe.", "error");
      return false;
    }
  };

  const changePassword = async () => {
    const email = session?.user.email;
    if (pw.next.length < 10) return toast("A nova senha precisa ter ao menos 10 caracteres.", "error");
    if (pw.next !== pw.confirm) return toast("As senhas não conferem.", "error");
    const { error: wrong } = await supabase.auth.signInWithPassword({ email: email ?? "", password: pw.current });
    if (wrong) return toast(wrong.message.includes("fetch") ? "Sem internet. Conecte-se para trocar a senha." : "A senha atual está incorreta.", "error");
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    if (error) return toast(error.message.includes("weak") || error.message.includes("pwned") ? "Essa senha é fraca ou já apareceu em vazamentos. Escolha outra." : "Não foi possível alterar a senha.", "error");
    setPw({ current: "", next: "", confirm: "" });
    toast("Senha alterada.");
  };

  return (
    <Screen title="Equipe" back>
      <Card title="Pessoas com acesso">
        {data.map((p) => (
          <Fragment key={p.id}>
            <ListItem
              left={<Avatar name={p.name} />} title={`${p.name}${p.id === me?.id ? " (você)" : ""}`} subtitle={`desde ${fmtDate(p.created_at)}`}
              right={asBool(p.is_admin) ? <Badge tone="gold">Administradora</Badge> : undefined}
            />
            {me?.isAdmin && p.id !== me.id && (
              <Row wrap style={{ paddingLeft: 8 }}>
                <Button small variant="outline" onPress={() => call({ action: "set_admin", user_id: p.id, is_admin: !asBool(p.is_admin) })}>{asBool(p.is_admin) ? "Tirar administração" : "Tornar administradora"}</Button>
                <ConfirmButton confirmText="Remover acesso" onConfirm={() => call({ action: "remove", user_id: p.id })}>Remover</ConfirmButton>
              </Row>
            )}
          </Fragment>
        ))}
      </Card>
      <Card title="Minha senha" eyebrow="Sua conta">
        <Field label="Senha atual" secureTextEntry value={pw.current} onChangeText={(current) => setPw({ ...pw, current })} />
        <Field label="Nova senha (mín. 10)" secureTextEntry value={pw.next} onChangeText={(next) => setPw({ ...pw, next })} />
        <Field label="Repita a nova senha" secureTextEntry value={pw.confirm} onChangeText={(confirm) => setPw({ ...pw, confirm })} />
        <Button onPress={changePassword}>Alterar senha</Button>
      </Card>
      {me?.isAdmin && (
        <Card title="Adicionar pessoa" eyebrow="Recepção, sócia ou outra profissional">
          <Field label="Nome" value={novo.name} onChangeText={(name) => setNovo({ ...novo, name })} />
          <Field label="E-mail" keyboardType="email-address" autoCapitalize="none" value={novo.email} onChangeText={(email) => setNovo({ ...novo, email })} />
          <Field label="Senha inicial (mín. 10)" secureTextEntry value={novo.password} onChangeText={(password) => setNovo({ ...novo, password })} />
          <Toggle label="Administradora" hint="Pode dar e tirar acessos." value={novo.is_admin} onChange={(is_admin) => setNovo({ ...novo, is_admin })} />
          <Button onPress={async () => {
            if (novo.name.trim().length < 2 || !novo.email.includes("@")) return toast("Informe nome e e-mail.", "error");
            if (novo.password.length < 10) return toast("A senha precisa ter ao menos 10 caracteres.", "error");
            if (await call({ action: "create", ...novo })) setNovo({ name: "", email: "", password: "", is_admin: false });
          }}>Criar acesso</Button>
        </Card>
      )}
      {!me?.isAdmin && <Txt.muted>Só administradoras podem dar ou tirar acessos.</Txt.muted>}
    </Screen>
  );
}
