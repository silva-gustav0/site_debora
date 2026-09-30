// Estado da conta da cliente no navegador, compartilhado entre balões, agendamento, ofertas e menu.
import { useSyncExternalStore } from "react";
import { getMyAccount, logoutAccount, type Account } from "@/app/actions/account";

/** Por que a janela de conta abriu: boas-vindas (5%), oferta (segue para o WhatsApp) ou "minha conta". */
export type AccountReason = { kind: "boas-vindas" } | { kind: "conta" } | { kind: "oferta"; id: string; name: string; href: string };
type State = { account: Account | null | undefined; modal: AccountReason | null };

let state: State = { account: undefined, modal: null };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const SERVER: State = { account: undefined, modal: null };

/** undefined = carregando; null = visitante (ou equipe); senão, a conta. */
export const useAccount = () => useSyncExternalStore(subscribe, () => state, () => SERVER);

let loading: Promise<void> | null = null;
/** Busca a conta no servidor (uma vez por página, ou de novo com force). */
export function loadAccount(force = false) {
  if (!loading || force) loading = getMyAccount().then((account) => set({ account })).catch(() => set({ account: null }));
  return loading;
}

export const openAccount = (modal: AccountReason) => set({ modal });
export const closeAccount = () => set({ modal: null });
export async function signOutAccount() { await logoutAccount(); set({ account: null, modal: null }); }

/** Oferta: sem conta, abre o cadastro antes do WhatsApp (uma vez por sessão; "continuar sem cadastro" libera). */
export function gateOffer(e: { preventDefault: () => void }, offer: { id: string; name: string; href: string }) {
  let skipped = false;
  try { skipped = sessionStorage.getItem("conta-pulou") === "1"; } catch {}
  if (state.account !== null || skipped) return false;
  e.preventDefault();
  openAccount({ kind: "oferta", ...offer });
  return true;
}
export const skipAccount = () => { try { sessionStorage.setItem("conta-pulou", "1"); } catch {} };
