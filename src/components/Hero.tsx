import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { ArrowRight, Star } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #FBF7EE 0%, #FDFAF7 40%, #FFF8E7 80%, #FDFAF7 100%)",
      }}
    >
      {/* Background radial glows */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(154,111,30,0.07) 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(201,151,58,0.05) 0%, transparent 70%)" }}
      />

      {/* Floating petal shapes */}
      <div
        className="animate-float absolute top-[20%] right-[8%] w-20 h-28 opacity-[0.12] pointer-events-none hidden lg:block"
        style={{
          background: "linear-gradient(160deg, #9A6F1E, #EEDFBF)",
          borderRadius: "60% 40% 70% 30% / 50% 50% 50% 50%",
        }}
      />
      <div
        className="animate-float absolute top-[55%] right-[18%] w-12 h-16 opacity-[0.1] pointer-events-none hidden lg:block"
        style={{
          background: "linear-gradient(160deg, #C9973A, #E8C882)",
          borderRadius: "50% 50% 30% 70% / 60% 40% 60% 40%",
          animationDelay: "2s",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-28 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* ── Text column ── */}
          <div>
            <AnimateIn animation="fade">
              <div
                className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full border border-bronze-200"
                style={{ background: "rgba(251,247,238,0.8)" }}
              >
                <Star size={11} className="text-gold-500 fill-gold-300" style={{ color: "#C9973A" }} />
                <span className="section-label">Para Mulheres e Homens</span>
              </div>
            </AnimateIn>

            <AnimateIn animation="up" delay={100}>
              <h1
                className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.1] text-bronze-900 mb-5"
                style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
              >
                Sua Beleza,
                <br />
                <em className="font-normal italic" style={{ color: "#9A6F1E" }}>
                  Nossa Arte
                </em>
              </h1>
            </AnimateIn>

            <AnimateIn animation="scale" delay={200}>
              <div className="gold-line mb-6" />
            </AnimateIn>

            <AnimateIn animation="up" delay={300}>
              <p
                className="text-base font-light leading-7 max-w-md mb-9"
                style={{
                  fontFamily: "var(--font-lato), sans-serif",
                  color: "#6B5A4B",
                }}
              >
                Um espaço criado especialmente para quem se cuida. Da
                limpeza de pele à massagem relaxante, cada atendimento é
                personalizado com técnica, segurança e acolhimento genuíno.
              </p>
            </AnimateIn>

            <AnimateIn animation="up" delay={400}>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#agendamento" className="btn-primary">
                  Agendar Consulta <ArrowRight size={15} />
                </a>
                <a href="#servicos" className="btn-outline">
                  Nossos Serviços
                </a>
              </div>
            </AnimateIn>

            <AnimateIn animation="up" delay={500}>
              <div className="flex gap-10 mt-12 pt-10 border-t border-bronze-100">
                {[
                  { value: "3", label: "Serviços especializados" },
                  { value: "100%", label: "Satisfação dos clientes" },
                  { value: "1:1", label: "Atendimento individual" },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className="text-3xl font-light leading-none mb-1"
                      style={{ fontFamily: "var(--font-cormorant), serif", color: "#6B4A10" }}
                    >
                      {s.value}
                    </div>
                    <div
                      className="text-[11px] tracking-[0.12em] uppercase"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#8F8070" }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </AnimateIn>
          </div>

          {/* ── Visual column ── */}
          <AnimateIn animation="right" delay={200} className="hidden lg:block">
            <div className="relative">
              {/* Main hero image */}
              <div
                className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(154,111,30,0.22)]"
              >
                <Image
                  src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80"
                  alt="Tratamento estético na Clínica Débora Silva"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* Rose overlay for brand harmony */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(154,111,30,0.08) 0%, rgba(201,151,58,0.04) 100%)",
                  }}
                />
              </div>

              {/* Floating review card */}
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[240px] bg-white/92 backdrop-blur-md rounded-xl px-5 py-3 shadow-lg"
                style={{ border: "1px solid #EEDFBF" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#9A6F1E,#6B4A10)" }}
                  >
                    <Star size={12} className="text-white fill-white" />
                  </div>
                  <div>
                    <div
                      className="text-[10px] font-light tracking-wide uppercase"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#8F8070" }}
                    >
                      Avaliação dos Clientes
                    </div>
                    <div
                      className="font-semibold"
                      style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "18px", color: "#6B4A10" }}
                    >
                      ★★★★★{" "}
                      <span style={{ fontSize: "13px", color: "#8F8070", fontWeight: 300 }}>
                        5.0
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo card top-left */}
              <div
                className="absolute -left-6 top-12 bg-white rounded-xl shadow-[0_8px_40px_rgba(201,151,58,0.18)] p-4 w-44"
                style={{ border: "1px solid #EEDFBF" }}
              >
                <div className="gold-line mb-3" />
                <div
                  className="font-light leading-tight mb-1"
                  style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "16px", color: "#C9973A" }}
                >
                  Inauguração
                </div>
                <div
                  className="uppercase tracking-widest mb-2"
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "8px", color: "#8F8070" }}
                >
                  Limpeza + Massagem
                </div>
                <div
                  style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "22px", color: "#9A6F1E", fontWeight: 400 }}
                >
                  R$ 300,00
                </div>
              </div>

              {/* Next appointment card bottom-right */}
              <div
                className="absolute -right-4 bottom-20 bg-white rounded-xl shadow-[0_8px_40px_rgba(154,111,30,0.18)] p-4 w-44"
                style={{ border: "1px solid #EEDFBF" }}
              >
                <div
                  className="uppercase tracking-widest mb-2"
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "9px", color: "#8F8070" }}
                >
                  Próximo horário
                </div>
                <div
                  style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "20px", color: "#6B4A10", fontWeight: 300 }}
                >
                  Hoje 14:30
                </div>
                <div
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "11px", color: "#8F8070", marginTop: "4px" }}
                >
                  Massagem Relaxante
                </div>
              </div>

              {/* Decorative accent rings */}
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full"
                style={{ border: "1.5px solid rgba(201,151,58,0.3)" }}
              />
              <div
                className="absolute -top-3 -left-3 w-14 h-14 rounded-full"
                style={{ border: "1px solid rgba(154,111,30,0.25)" }}
              />
            </div>
          </AnimateIn>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
        <span className="section-label" style={{ fontSize: "9px" }}>Rolar</span>
        <div className="animate-scroll w-px h-6" style={{ background: "#9A6F1E" }} />
      </div>
    </section>
  );
}
