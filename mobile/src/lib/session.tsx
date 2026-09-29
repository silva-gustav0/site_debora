import type { Session } from "@supabase/supabase-js";
import * as LocalAuthentication from "expo-local-authentication";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { startSync, wipeDevice } from "@/db/database";
import { supabase } from "./supabase";

/** Depois de quanto tempo em segundo plano o app pede a digital/PIN de novo. */
const LOCK_AFTER_MS = 5 * 60_000;

type Status = "loading" | "signed-out" | "locked" | "ready";
type SessionCtx = {
  status: Status;
  session: Session | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  unlock: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);
export const useSession = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession fora do SessionProvider");
  return c;
};

/**
 * Confere no servidor se a pessoa ainda faz parte da equipe. Só responde "não" quando o servidor
 * responde de fato (sem internet, o app segue funcionando offline).
 */
async function stillStaff(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from("staff").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) return null;
  return Boolean(data);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const backgroundAt = useRef<number | null>(null);

  const signOut = useCallback(async () => {
    await wipeDevice().catch(() => {});
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    setSession(null);
    setStatus("signed-out");
  }, []);

  const unlock = useCallback(async () => {
    setError(null);
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    if (level === LocalAuthentication.SecurityLevel.NONE) {
      setError("Configure uma senha, PIN ou digital no aparelho para usar o app (protege os dados das clientes).");
      return;
    }
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Desbloquear o app da clínica", cancelLabel: "Cancelar" });
    if (!r.success) return;
    setStatus("ready");
  }, []);

  // Sessão salva: abre travado; sem sessão, vai para o login.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setStatus(data.session ? "locked" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Liberado: sincroniza e confere se o acesso não foi removido (se foi, apaga tudo do aparelho).
  useEffect(() => {
    if (status !== "ready" || !session) return;
    startSync().catch(() => {});
    stillStaff(session.user.id).then((ok) => {
      if (ok === false) {
        setError("Seu acesso ao painel foi removido. Os dados foram apagados deste aparelho.");
        signOut();
      }
    });
  }, [status, session, signOut]);

  // Trava de novo depois de um tempo em segundo plano.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") { backgroundAt.current = Date.now(); return; }
      startSync().catch(() => {}); // o Android corta a conexão em segundo plano: reconecta na hora ao voltar
      if (backgroundAt.current && Date.now() - backgroundAt.current > LOCK_AFTER_MS) {
        setStatus((cur) => (cur === "ready" ? "locked" : cur));
      }
      backgroundAt.current = null;
    });
    return () => sub.remove();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (e || !data.session) return "E-mail ou senha incorretos.";
    if ((await stillStaff(data.user.id)) !== true) {
      await supabase.auth.signOut({ scope: "local" });
      return "Esta conta não tem acesso ao painel da clínica.";
    }
    setSession(data.session);
    setStatus("locked");
    return null;
  }, []);

  return <Ctx.Provider value={{ status, session, error, signIn, unlock, signOut }}>{children}</Ctx.Provider>;
}
