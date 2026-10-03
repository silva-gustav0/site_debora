"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Gift, X } from "lucide-react";
import { brl, diffDays, fmtDate, todaySP } from "@/lib/format";
import type { Promotion } from "@/lib/site-content";
import { siteWhatsapp, track } from "@/lib/site-tracking";
import { gateOffer, useAccount } from "@/lib/account-store";

const storageKey = (id: string) => `aviso-promocao-fechado:${id}`;

/** Cartão flutuante da promoção marcada como aviso fixo; a visitante pode fechar e ele não volta para essa promoção. */
export default function PromoNotice({ promo, phone }: { promo: Promotion; phone: string }) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const [atBooking, setAtBooking] = useState(false);
  const { account } = useAccount();
  const pct = account?.discount?.state === "disponivel" ? account.discount.pct : 0;

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(storageKey(promo.id)) === "1"; } catch {}
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(t);
  }, [promo.id]);

  // Some enquanto o formulário de agendamento está na tela, para não cobri-lo.
  useEffect(() => {
    const target = document.getElementById("agendamento");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setAtBooking(e.isIntersecting), { threshold: 0.15 });
    io.observe(target);
    return () => io.disconnect();
  }, []);

  if (!visible || closed) return null;

  const close = () => {
    setClosed(true);
    try { localStorage.setItem(storageKey(promo.id), "1"); } catch {}
  };
  const daysLeft = promo.ends_on ? diffDays(todaySP(), promo.ends_on) : null;
  const deadline = daysLeft === null ? null
    : daysLeft === 0 ? "Termina hoje"
    : daysLeft <= 7 ? `Faltam ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}`
    : `Válido até ${fmtDate(promo.ends_on, { year: undefined })}`;
  // O botão leva ao WhatsApp da Débora já dizendo que veio do site por esta promoção.
  const href = siteWhatsapp(phone, { kind: "promocao", id: promo.id, name: promo.title }, pct);
  const onCta = (e: React.MouseEvent) => {
    if (!gateOffer(e, { id: promo.id, name: promo.title, href })) track("whatsapp", `aviso:promocao:${promo.id}`);
  };

  return (
    <aside
      aria-label="Oferta especial"
      data-track="promocao" data-track-id={promo.id} data-track-name={promo.title}
      aria-hidden={atBooking || undefined}
      className={`promo-notice fixed z-40 bottom-3 left-3 right-[84px] sm:right-auto sm:left-6 sm:bottom-6 sm:w-[370px] rounded-2xl overflow-hidden transition-all duration-500 ${atBooking ? "opacity-0 translate-y-6 pointer-events-none" : ""}`}
      style={{
        background: "linear-gradient(135deg, #2B221B 0%, #3B2E24 100%)",
        border: "1px solid rgba(201,151,58,0.4)",
        boxShadow: "0 18px 50px rgba(43,34,27,0.35), 0 0 0 1px rgba(232,200,130,0.08) inset",
      }}
    >
      <div aria-hidden className="h-[3px]" style={{ background: "linear-gradient(90deg,#C9973A,#F3DDA6,#C9973A)" }} />
      <button
        onClick={close}
        aria-label="Fechar aviso de oferta"
        className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex gap-3.5 p-4 pr-11 sm:p-5 sm:pr-12">
        {promo.image_url ? (
          <Image src={promo.image_url} alt="" width={128} height={128} sizes="64px" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0" style={{ border: "1px solid rgba(201,151,58,0.4)" }} />
        ) : (
          <div className="promo-notice-icon w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}>
            <Gift size={19} className="text-white" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.28em] uppercase mb-1" style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}>
            {promo.label}
          </p>
          <p className="text-[19px] sm:text-xl leading-snug font-light text-white" style={{ fontFamily: "var(--font-cormorant), serif" }}>
            {promo.notice_text || promo.title}
          </p>
          <div className="flex items-baseline flex-wrap gap-x-2.5 mt-1.5" style={{ fontFamily: "var(--font-lato), sans-serif" }}>
            {promo.price !== null && (
              <>
                {promo.old_price !== null && promo.old_price > promo.price && (
                  <span className="text-xs line-through text-white/40">{brl(promo.old_price)}</span>
                )}
                <span className="text-lg" style={{ fontFamily: "var(--font-cormorant), serif", color: "#E8C882" }}>{brl(promo.price)}</span>
              </>
            )}
            {deadline && <span className="text-[11px] tracking-wide" style={{ color: "rgba(232,200,130,0.8)" }}>{deadline}</span>}
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCta}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase font-bold rounded-full px-4 py-2.5 transition-transform active:scale-95"
            style={{ fontFamily: "var(--font-lato), sans-serif", color: "#2B221B", background: "linear-gradient(135deg,#E8C882,#C9973A)" }}
          >
            {promo.cta_label} <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </aside>
  );
}
