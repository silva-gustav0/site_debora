import { ArrowRight, Star } from "lucide-react";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #FFF5F7 0%, #FDFAF7 40%, #FFF8E7 80%, #FDFAF7 100%)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: "radial-gradient(circle, #C8737A 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: "radial-gradient(circle, #C9973A 0%, transparent 70%)" }}
      />

      {/* Floating petal shapes */}
      <div
        className="animate-float absolute top-[20%] right-[8%] w-20 h-28 opacity-[0.12] pointer-events-none"
        style={{
          background: "linear-gradient(160deg, #C8737A, #F4C2C2)",
          borderRadius: "60% 40% 70% 30% / 50% 50% 50% 50%",
          animationDelay: "0s",
        }}
      />
      <div
        className="animate-float absolute top-[55%] right-[18%] w-12 h-16 opacity-[0.1] pointer-events-none"
        style={{
          background: "linear-gradient(160deg, #C9973A, #E8C882)",
          borderRadius: "50% 50% 30% 70% / 60% 40% 60% 40%",
          animationDelay: "2s",
        }}
      />
      <div
        className="animate-float absolute top-[35%] left-[5%] w-10 h-14 opacity-[0.08] pointer-events-none"
        style={{
          background: "linear-gradient(160deg, #8B3A42, #C8737A)",
          borderRadius: "40% 60% 60% 40% / 50% 50% 50% 50%",
          animationDelay: "4s",
        }}
      />

      {/* Thin gold vertical line — decorative */}
      <div className="absolute left-[calc(50%-400px)] top-0 h-full w-px opacity-[0.06] hidden xl:block"
        style={{ background: "linear-gradient(180deg, transparent, #C9973A 30%, #C9973A 70%, transparent)" }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-32 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text column */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-rose-200"
              style={{ background: "rgba(255,245,247,0.8)" }}
              data-animate="fade"
            >
              <Star size={11} className="text-gold-500 fill-gold-300" />
              <span className="section-label" style={{ color: "#C9973A" }}>
                Clínica Premium de Estética
              </span>
            </div>

            {/* Heading */}
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.1] text-rose-900 mb-6"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
              data-animate="up"
              data-delay="100"
            >
              Sua Beleza,
              <br />
              <em className="font-normal italic" style={{ color: "#C8737A" }}>
                Nossa Arte
              </em>
            </h1>

            {/* Divider */}
            <div
              className="gold-line mb-6"
              data-animate="scale"
              data-delay="200"
              style={{ transformOrigin: "left" }}
            />

            {/* Subtitle */}
            <p
              className="text-base font-light leading-7 text-text-secondary max-w-md mb-10"
              style={{ fontFamily: "var(--font-lato), sans-serif" }}
              data-animate="up"
              data-delay="300"
            >
              Transformamos cuidados estéticos em experiências sensoriais
              únicas. Do tratamento facial ao ritual de SPA, cada visita é
              pensada para realçar sua beleza natural e renovar sua energia.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-4"
              data-animate="up"
              data-delay="400"
            >
              <a href="#agendamento" className="btn-primary">
                Agendar Consulta <ArrowRight size={15} />
              </a>
              <a href="#servicos" className="btn-outline">
                Nossos Serviços
              </a>
            </div>

            {/* Stats */}
            <div
              className="flex gap-10 mt-14 pt-10 border-t border-rose-100"
              data-animate="up"
              data-delay="500"
            >
              {[
                { value: "15+", label: "Anos de experiência" },
                { value: "2.400+", label: "Clientes atendidas" },
                { value: "12", label: "Tratamentos exclusivos" },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    className="text-3xl font-light text-rose-700 leading-none mb-1"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {s.value}
                  </div>
                  <div
                    className="text-[11px] tracking-[0.12em] uppercase text-text-muted"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual column */}
          <div
            className="relative hidden lg:flex items-center justify-center"
            data-animate="fade"
            data-delay="200"
          >
            {/* Main card */}
            <div
              className="relative w-[360px] h-[460px] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(200,115,122,0.2)]"
              style={{
                background:
                  "linear-gradient(160deg, #FFE8ED 0%, #FFF0C4 50%, #FFE8ED 100%)",
              }}
            >
              {/* Stylised photo placeholder with initials/icon */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div
                  className="w-28 h-28 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, #C8737A, #8B3A42)" }}
                >
                  <span
                    className="text-4xl font-light text-white/90 italic"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    CD
                  </span>
                </div>
                <p
                  className="text-rose-700 text-base tracking-widest uppercase font-light mt-2"
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "10px" }}
                >
                  Clínica Débora
                </p>
              </div>

              {/* Floating tag */}
              <div
                className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[240px] bg-white/90 backdrop-blur-sm rounded-xl px-5 py-3 shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#C8737A,#8B3A42)" }}
                  >
                    <Star size={12} className="text-white fill-white" />
                  </div>
                  <div>
                    <div
                      className="text-[11px] font-light tracking-wide text-text-muted uppercase"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
                    >
                      Avaliação
                    </div>
                    <div
                      className="text-sm font-semibold text-rose-700"
                      style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "16px" }}
                    >
                      ★★★★★ <span className="text-xs text-text-muted font-light">5.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary floating card */}
            <div
              className="absolute -left-8 top-16 bg-white rounded-xl shadow-[0_8px_40px_rgba(201,151,58,0.15)] p-4 w-44"
              style={{ border: "1px solid #F9C7CE" }}
            >
              <div className="gold-line mb-3" />
              <div
                className="text-[22px] font-light text-gold-600 leading-none"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Promo
              </div>
              <div
                className="text-[10px] tracking-widest uppercase text-text-muted mt-1"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Limpeza de Pele
              </div>
              <div
                className="text-rose-600 font-semibold mt-2 text-sm"
                style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "18px" }}
              >
                R$ 99,90
              </div>
              <div className="text-[9px] text-text-muted line-through" style={{fontFamily:"var(--font-lato)"}}>
                R$ 120,00
              </div>
            </div>

            {/* Third small card */}
            <div
              className="absolute -right-4 bottom-20 bg-white rounded-xl shadow-[0_8px_40px_rgba(200,115,122,0.15)] p-4 w-40"
              style={{ border: "1px solid #F9C7CE" }}
            >
              <div
                className="text-[11px] uppercase tracking-widest text-text-muted mb-2"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Próximo horário
              </div>
              <div
                className="text-rose-700 font-light text-xl"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Hoje 14:30
              </div>
              <div
                className="mt-2 text-[10px] text-text-muted"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Day SPA Completo
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span className="section-label text-[9px]">Rolar</span>
        <div className="animate-scroll w-px h-6 bg-rose-400" />
      </div>
    </section>
  );
}
