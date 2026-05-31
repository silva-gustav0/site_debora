"use client";

import { useState } from "react";
import { Sparkles, Waves, Heart } from "lucide-react";
import AnimateIn from "./AnimateIn";
import { services, categoryLabels, type Service } from "@/lib/data";

const CATEGORIES = ["all", "facial", "corporal", "terapias"] as const;

const catIcons: Record<string, React.ElementType> = {
  all:      Sparkles,
  facial:   Sparkles,
  corporal: Waves,
  terapias: Heart,
};

const catColors: Record<string, { bg: string; text: string; border: string }> = {
  facial:   { bg: "#FFF5F7",  text: "#C8737A",  border: "#F9C7CE"  },
  corporal: { bg: "#FFF8E7",  text: "#C9973A",  border: "#E8C882"  },
  terapias: { bg: "#F5F7FF",  text: "#6A7BC9",  border: "#C4CAE8"  },
};

function ServiceCard({ s, index }: { s: Service; index: number }) {
  const colors = catColors[s.category];
  return (
    <AnimateIn animation="up" delay={Math.min(index * 80, 600) as any}>
      <div
        className="hover-lift relative rounded-xl p-6 flex flex-col h-full group cursor-default"
        style={{
          background: "white",
          border: "1px solid #F9C7CE",
          boxShadow: "0 2px 16px rgba(200,115,122,0.06)",
        }}
      >
        {s.highlight && (
          <div
            className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9px] tracking-widest uppercase"
            style={{
              background: "linear-gradient(135deg,#C9973A,#E8C882)",
              color: "white",
              fontFamily: "var(--font-lato), sans-serif",
            }}
          >
            Destaque
          </div>
        )}

        {/* Category badge */}
        <div
          className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full mb-4"
          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <span
            className="text-[9.5px] tracking-widest uppercase"
            style={{ fontFamily: "var(--font-lato), sans-serif", color: colors.text }}
          >
            {categoryLabels[s.category]}
          </span>
        </div>

        <h3
          className="text-xl font-light text-rose-800 mb-2 leading-snug"
          style={{ fontFamily: "var(--font-cormorant), serif" }}
        >
          {s.title}
        </h3>

        <p
          className="text-sm font-light leading-6.5 text-text-muted flex-1 mb-5"
          style={{ fontFamily: "var(--font-lato), sans-serif" }}
        >
          {s.description}
        </p>

        <div className="pt-4 border-t border-rose-50">
          <a
            href="#agendamento"
            className="text-[11px] tracking-widest uppercase flex items-center gap-1.5 hover:gap-3 transition-all duration-200"
            style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C8737A" }}
          >
            Agendar este serviço →
          </a>
        </div>
      </div>
    </AnimateIn>
  );
}

export default function Services() {
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("all");

  const filtered =
    active === "all" ? services : services.filter((s) => s.category === active);

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
              Tratamentos cuidadosamente desenvolvidos para realçar sua beleza
              natural e promover seu bem-estar de forma integral.
            </p>
          </AnimateIn>
        </div>

        {/* Tabs */}
        <AnimateIn animation="up" delay={200}>
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {CATEGORIES.map((cat) => {
              const Icon = catIcons[cat];
              const isActive = active === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 text-[11px] tracking-[0.12em] uppercase"
                  style={{
                    fontFamily: "var(--font-lato), sans-serif",
                    background: isActive
                      ? "linear-gradient(135deg,#C8737A,#8B3A42)"
                      : "white",
                    color: isActive ? "white" : "#6B4C52",
                    border: isActive ? "1.5px solid #C8737A" : "1.5px solid #F4C2C2",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(200,115,122,0.3)"
                      : "none",
                  }}
                >
                  <Icon size={12} />
                  {cat === "all"
                    ? "Todos"
                    : categoryLabels[cat as keyof typeof categoryLabels]}
                </button>
              );
            })}
          </div>
        </AnimateIn>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((s, i) => (
            <ServiceCard key={s.id} s={s} index={i} />
          ))}
        </div>

        {/* CTA */}
        <AnimateIn animation="up" delay={400}>
          <div className="text-center mt-14">
            <a href="#agendamento" className="btn-primary">
              <Sparkles size={14} />
              Agendar um Serviço
            </a>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
