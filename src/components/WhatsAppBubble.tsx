"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { ATTENDANT, flush, type Interest, interestRaw, setInterest, siteWhatsapp, track } from "@/lib/site-tracking";

const SECTIONS = ["servicos", "agendamento", "contato", "blog"];

/** Marca "já feito nesta sessão" (sessionStorage pode estar bloqueado: então sempre faz). */
function once(key: string) {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
}

const subscribe = (cb: () => void) => { window.addEventListener("site-interesse", cb); return () => window.removeEventListener("site-interesse", cb); };

/** Origem da visita: ?utm_source=, site de onde veio ou "direto". */
function origin() {
  const utm = new URLSearchParams(location.search).get("utm_source");
  if (utm) return utm.toLowerCase();
  try {
    const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    return !host || host === location.hostname ? "direto" : host;
  } catch { return "direto"; }
}

/** Observa o que a visitante vê (serviços, promoções, seções) e guarda o último interesse. */
function useTracking() {
  useEffect(() => {
    if (once("site-visita")) track("visita", origin());
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (!e.isIntersecting) { clearTimeout(timers.get(el)); continue; }
        // Conta só quando fica na tela por um tempinho (passar rolando não é interesse).
        timers.set(el, setTimeout(() => {
          const { track: kind, trackId: id, trackName: name } = el.dataset;
          if (kind === "servico" || kind === "promocao") {
            track(kind, id);
            if (id && name) setInterest({ kind, id, name });
          } else if (el.id) track("secao", el.id);
        }, 1500));
      }
    }, { threshold: 0.5 });
    const scan = () => {
      document.querySelectorAll("[data-track]").forEach((el) => io.observe(el));
      SECTIONS.forEach((id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    };
    scan();
    const rescan = setTimeout(scan, 3000); // o aviso de promoção aparece depois de carregar
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", flush);
    const every = setInterval(flush, 15_000);
    return () => {
      io.disconnect(); timers.forEach(clearTimeout); clearInterval(every); clearTimeout(rescan);
      document.removeEventListener("visibilitychange", hide); window.removeEventListener("pagehide", flush);
    };
  }, []);
}

/** Balão fixo do WhatsApp da Débora, com mensagem pronta e sugestão conforme o que a visitante olhou. */
export default function WhatsAppBubble({ phone }: { phone: string }) {
  useTracking();
  const raw = useSyncExternalStore(subscribe, interestRaw, () => null);
  const interest = useMemo<Interest | null>(() => { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }, [raw]);
  const [tip, setTip] = useState(false);

  useEffect(() => {
    // Uma sugestão por sessão, depois de um tempo navegando.
    const t = setTimeout(() => { if (once("site-dica")) setTip(true); }, 25_000);
    return () => clearTimeout(t);
  }, []);

  const href = siteWhatsapp(phone, interest);
  const click = () => { setTip(false); track("whatsapp", `balao${interest ? `:${interest.kind}:${interest.id}` : ""}`); };
  const tipText = interest?.kind === "promocao" ? `Quer garantir a promoção “${interest.name}”? Chame a ${ATTENDANT} no WhatsApp.`
    : interest ? `Ficou com alguma dúvida sobre ${interest.name}? A ${ATTENDANT} responde pelo WhatsApp.`
    : `Oi! Quer ajuda para escolher o tratamento ideal? Fale com a ${ATTENDANT}.`;

  return (
    <div className="fixed z-50 bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-3" style={{ fontFamily: "var(--font-lato), sans-serif" }}>
      {tip && (
        <div role="status" className="relative max-w-[250px] rounded-2xl bg-white px-4 py-3 pr-9 text-[13.5px] leading-snug text-[#3B2E24] shadow-[0_12px_36px_rgba(43,34,27,0.22)]" style={{ border: "1px solid #EEDFBF" }}>
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={click}>{tipText}</a>
          <button onClick={() => setTip(false)} aria-label="Fechar sugestão" className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full text-[#A69885] hover:bg-[#FAF5EC]">
            <X size={14} />
          </button>
        </div>
      )}
      <a
        href={href} target="_blank" rel="noopener noreferrer" onClick={click}
        aria-label={`Falar com a ${ATTENDANT} pelo WhatsApp`} title={`Falar com a ${ATTENDANT} pelo WhatsApp`}
        className="whatsapp-bubble w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_10px_30px_rgba(37,211,102,0.45)] transition-transform hover:scale-105 active:scale-95"
        style={{ background: "#25D366" }}
      >
        <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden>
          <path d="M16.04 3C8.86 3 3.04 8.8 3.04 15.96c0 2.29.6 4.52 1.74 6.49L3 29l6.72-1.76a13 13 0 0 0 6.32 1.61h.01c7.17 0 13-5.8 13-12.96C29.05 8.8 23.21 3 16.04 3Zm0 23.67h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.23-3.99 1.04 1.07-3.88-.26-.4a10.7 10.7 0 0 1-1.65-5.74c0-5.96 4.86-10.8 10.84-10.8 5.97 0 10.83 4.84 10.83 10.8 0 5.96-4.86 10.71-10.93 10.71Zm5.94-8.09c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.73.16-.22.33-.84 1.06-1.03 1.27-.19.22-.38.24-.71.08-.33-.16-1.38-.51-2.63-1.62-.97-.86-1.63-1.93-1.82-2.25-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.5 5.56 4.91.78.33 1.39.53 1.86.68.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.41.19-1.55-.08-.13-.3-.22-.63-.38Z" />
        </svg>
      </a>
    </div>
  );
}
