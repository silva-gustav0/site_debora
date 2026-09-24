"use client";

import AnimateIn from "./AnimateIn";
import {
  Sparkles, Waves, Heart, Flower2, Leaf, Sun, Droplet, Gem, Hand, Star, ArrowRight, Tag,
} from "lucide-react";
import { brl, fmtDate } from "@/lib/format";
import type { HomeService, Promotion, ServiceIcon, SiteContent } from "@/lib/site-content";

const ICONS: Record<ServiceIcon, React.ElementType> = {
  sparkles: Sparkles, waves: Waves, heart: Heart, flower: Flower2, leaf: Leaf,
  sun: Sun, droplet: Droplet, gem: Gem, hand: Hand, star: Star,
};

const PALETTE = [
  { color: "#9A6F1E", bg: "#FBF7EE", border: "#EEDFBF" },
  { color: "#C9973A", bg: "#FFF8E7", border: "#E8C882" },
  { color: "#6B8F71", bg: "#F4F8F5", border: "#C9DACF" },
];

/** Leva ao agendamento já com o serviço da promoção selecionado. */
const selectService = (id: string | null) => {
  if (id) window.dispatchEvent(new CustomEvent("select-service", { detail: id }));
};

export default function Services({
  content: c, services, promotions,
}: { content: SiteContent["services"]; services: HomeService[]; promotions: Promotion[] }) {
  const cols = services.length >= 3 ? "sm:grid-cols-3" : services.length === 2 ? "sm:grid-cols-2" : "";

  return (
    <section
      id="servicos"
      className="py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7F2EC 0%, #FDFAF7 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <AnimateIn animation="fade">
            <span className="section-label">{c.eyebrow}</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light text-bronze-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {c.title}{" "}
              <em className="italic font-normal" style={{ color: "#9A6F1E" }}>
                {c.title_highlight}
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto mb-6" />
          </AnimateIn>
          {c.subtitle && (
            <AnimateIn animation="up" delay={300}>
              <p
                className="text-base font-light text-text-secondary max-w-lg leading-7"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                {c.subtitle}
              </p>
            </AnimateIn>
          )}
        </div>

        {/* Service cards */}
        {services.length > 0 && (
          <div className={`grid ${cols} gap-7 mb-14`}>
            {services.map((s, i) => {
              const cfg = PALETTE[i % PALETTE.length];
              const Icon = ICONS[s.icon] ?? Sparkles;
              return (
                <AnimateIn key={s.id} animation="up" delay={(i % 3) * 120}>
                  <div
                    className="hover-lift rounded-2xl p-8 flex flex-col h-full"
                    style={{
                      background: "white",
                      border: `1px solid ${cfg.border}`,
                      boxShadow: "0 2px 24px rgba(154,111,30,0.07)",
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <Icon size={22} style={{ color: cfg.color }} />
                    </div>

                    <h3
                      className="text-2xl font-light mb-3"
                      style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
                    >
                      {s.name}
                    </h3>

                    <p
                      className="text-sm font-light leading-7 text-text-muted flex-1 mb-6"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
                    >
                      {s.description}
                    </p>

                    <a
                      href="#agendamento"
                      onClick={() => selectService(s.id)}
                      className="flex items-center gap-2 text-[11px] tracking-widest uppercase hover:gap-3 transition-all duration-200"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: cfg.color }}
                    >
                      {c.cta} <ArrowRight size={11} />
                    </a>
                  </div>
                </AnimateIn>
              );
            })}
          </div>
        )}

        {/* Promo banners */}
        <div className="flex flex-col gap-5">
          {promotions.map((p, i) => (
            <AnimateIn key={p.id} animation="up" delay={300 + i * 100}>
              <div
                className="rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
                style={{
                  background: "linear-gradient(135deg, #2B221B 0%, #3B2E24 100%)",
                  border: "1px solid rgba(201,151,58,0.3)",
                }}
              >
                <div className="flex items-start gap-4">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                      style={{ border: "1px solid rgba(201,151,58,0.4)" }}
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}
                    >
                      <Tag size={18} className="text-white" />
                    </div>
                  )}
                  <div>
                    <p
                      className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
                    >
                      {p.label}
                    </p>
                    <h3
                      className="text-2xl font-light text-white mb-1"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      {p.title}
                    </h3>
                    {p.description && (
                      <p
                        className="text-sm font-light"
                        style={{ fontFamily: "var(--font-lato), sans-serif", color: "rgba(255,255,255,0.55)" }}
                      >
                        {p.description}
                      </p>
                    )}
                    {p.ends_on && (
                      <p
                        className="text-[11px] mt-2 tracking-wide"
                        style={{ fontFamily: "var(--font-lato), sans-serif", color: "rgba(232,200,130,0.8)" }}
                      >
                        Válido até {fmtDate(p.ends_on)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-3 flex-shrink-0">
                  {p.price !== null && (
                    <div className="text-center sm:text-right">
                      {p.old_price !== null && p.old_price > p.price && (
                        <div
                          className="text-sm line-through"
                          style={{ fontFamily: "var(--font-lato), sans-serif", color: "rgba(255,255,255,0.45)" }}
                        >
                          {brl(p.old_price)}
                        </div>
                      )}
                      <div
                        className="text-4xl font-light leading-none"
                        style={{ fontFamily: "var(--font-cormorant), serif", color: "#E8C882" }}
                      >
                        {brl(p.price)}
                      </div>
                    </div>
                  )}
                  <a href="#agendamento" onClick={() => selectService(p.service_id)} className="btn-primary">
                    {p.cta_label} <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
