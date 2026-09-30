// Navegação anônima do site (só no navegador): o que a visitante viu, para o relatório e para o WhatsApp contextual.
import { whatsappLink } from "./format";

export const ATTENDANT = "Débora";
export type Interest = { kind: "servico" | "promocao"; id: string; name: string };
type Event = { k: string; t?: string; p: string };

const queue: Event[] = [];
const store = () => { try { return sessionStorage; } catch { return null; } };

/** Sessão aleatória da aba (some ao fechar o navegador; não identifica a pessoa). */
function session() {
  const s = store();
  let id = s?.getItem("site-sessao");
  if (!id) { id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; s?.setItem("site-sessao", id); }
  return id;
}

/** Registra um evento; vistas de serviço/promoção/seção contam uma vez por sessão. */
export function track(kind: "visita" | "servico" | "promocao" | "secao" | "whatsapp", target?: string) {
  if (kind !== "whatsapp" && kind !== "visita") {
    const s = store(), key = `site-visto:${kind}:${target}`;
    if (s?.getItem(key)) return;
    s?.setItem(key, "1");
  }
  queue.push({ k: kind, t: target, p: location.pathname });
  if (kind === "whatsapp") flush();
}

/** Envia o que estiver na fila (sendBeacon sobrevive ao fechamento da página). */
export function flush() {
  if (!queue.length) return;
  const body = JSON.stringify({ s: session(), e: queue.splice(0) });
  if (!navigator.sendBeacon?.("/api/eventos", new Blob([body], { type: "application/json" }))) {
    fetch("/api/eventos", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

/** Último serviço ou promoção em que a visitante se demorou (texto JSON guardado na aba). */
export const interestRaw = () => store()?.getItem("site-interesse") ?? null;
export function setInterest(i: Interest) {
  store()?.setItem("site-interesse", JSON.stringify(i));
  window.dispatchEvent(new Event("site-interesse"));
}

/** Mensagem pronta para a Débora, dizendo que veio do site e o que interessou. */
export function siteMessage(i: Interest | null) {
  if (i?.kind === "promocao") return `Olá, ${ATTENDANT}! Vim pelo site e tenho interesse na promoção "${i.name}".`;
  if (i?.kind === "servico") return `Olá, ${ATTENDANT}! Vim pelo site e gostaria de saber mais sobre ${i.name}.`;
  return `Olá, ${ATTENDANT}! Vim pelo site e gostaria de mais informações.`;
}

export const siteWhatsapp = (phone: string, i: Interest | null) => whatsappLink(phone, siteMessage(i)) ?? "#";
