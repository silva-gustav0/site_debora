"use client";

import AnimateIn from "./AnimateIn";
import { services } from "@/lib/data";
import { Sparkles, Waves, Heart, ArrowRight, Tag } from "lucide-react";

const serviceConfig: Record<string, {
  Icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  "limpeza-pele": {
    Icon: Sparkles,
    color: "#C8737A",
    bg: "#FFF5F7",
    border: "#F9C7CE",
  },
  "drenagem-linfatica": {
    Icon: Waves,
    color: "#C9973A",
    bg: "#FFF8E7",
    border: "#E8C882",
  },
  "massagem-relaxante": {
    Icon: Heart,
    color: "#6A7BC9",
    bg: "#F5F7FF",
    border: "#C4CAE8",
  },
};

export default function Services() {
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
            <span className="section-label">O Que Oferecemos</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Nossos{" "}
              <em className="italic font-normal" style={{ color: "#C8737A" }}>
                Serviços
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto mb-6" />
          </AnimateIn>
          <AnimateIn animation="up" delay={300}>
            <p
              className="text-base font-light text-text-secondary max-w-lg leading-7"
              style={{ fontFamily: "var(--font-lato), sans-serif" }}
            >
              Atendimentos personalizados para cuidar da beleza, relaxamento e bem-estar feminino.
            </p>
          </AnimateIn>
        </div>

        {/* Service cards */}
        <div className="grid sm:grid-cols-3 gap-7 mb-14">
          {services.map((s, i) => {
            const cfg = serviceConfig[s.id];
            const Icon = cfg?.Icon ?? Sparkles;
            return (
              <AnimateIn key={s.id} animation="up" delay={i * 120 as any}>
                <div
                  className="hover-lift rounded-2xl p-8 flex flex-col h-full"
                  style={{
                    background: "white",
                    border: `1px solid ${cfg?.border ?? "#F9C7CE"}`,
                    boxShadow: "0 2px 24px rgba(200,115,122,0.07)",
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: cfg?.bg ?? "#FFF5F7", border: `1px solid ${cfg?.border ?? "#F9C7CE"}` }}
                  >
                    <Icon size={22} style={{ color: cfg?.color ?? "#C8737A" }} />
                  </div>

                  <h3
                    className="text-2xl font-light mb-3"
                    style={{ fontFamily: "var(--font-cormorant), serif", color: "#4A1820" }}
                  >
                    {s.title}
                  </h3>

                  <p
                    className="text-sm font-light leading-7 text-text-muted flex-1 mb-6"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {s.description}
                  </p>

                  <a
                    href="#agendamento"
                    className="flex items-center gap-2 text-[11px] tracking-widest uppercase hover:gap-3 transition-all duration-200"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: cfg?.color ?? "#C8737A" }}
                  >
                    Agendar <ArrowRight size={11} />
                  </a>
                </div>
              </AnimateIn>
            );
          })}
        </div>

        {/* Promo banner */}
        <AnimateIn animation="up" delay={300}>
          <div
            className="rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6"
            style={{
              background: "linear-gradient(135deg, #2C1A1E 0%, #3D2328 100%)",
              border: "1px solid rgba(201,151,58,0.3)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}
              >
                <Tag size={18} className="text-white" />
              </div>
              <div>
                <p
                  className="text-[10px] tracking-[0.3em] uppercase mb-1.5"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
                >
                  Promoção de Inauguração
                </p>
                <h3
                  className="text-2xl font-light text-white mb-1"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  Limpeza de Pele + 10 min Massagem Relaxante
                </h3>
                <p
                  className="text-sm font-light"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "rgba(255,255,255,0.55)" }}
                >
                  Tratamento completo a preço especial de inauguração
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-3 flex-shrink-0">
              <div
                className="text-4xl font-light leading-none"
                style={{ fontFamily: "var(--font-cormorant), serif", color: "#E8C882" }}
              >
                R$ 300,00
              </div>
              <a href="#agendamento" className="btn-primary">
                Aproveitar Oferta <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
