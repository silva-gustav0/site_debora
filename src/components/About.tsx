import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { Heart, Eye, Diamond } from "lucide-react";

const pillars = [
  {
    icon: Heart,
    title: "Missão",
    text: "Proporcionar experiências transformadoras de beleza e bem-estar, unindo ciência estética e cuidado humano para realçar a beleza autêntica de cada cliente.",
    gradient: "linear-gradient(135deg,#C8737A,#8B3A42)",
    bg: "linear-gradient(135deg,#FFF5F7,#FDFAF7)",
    border: "#F9C7CE",
  },
  {
    icon: Eye,
    title: "Visão",
    text: "Ser a clínica de estética de referência em atendimento premium, reconhecida pela excelência técnica, ambiente acolhedor e resultados que superam expectativas.",
    gradient: "linear-gradient(135deg,#C9973A,#A87B25)",
    bg: "linear-gradient(135deg,#FFF8E7,#FDFAF7)",
    border: "#E8C882",
  },
  {
    icon: Diamond,
    title: "Valores",
    text: "Ética e transparência em cada atendimento. Compromisso com a excelência, respeito à individualidade e dedicação contínua à evolução profissional.",
    gradient: "linear-gradient(135deg,#C8737A,#C9973A)",
    bg: "linear-gradient(135deg,#FFF5F7,#FFF8E7)",
    border: "#F4A6B0",
  },
];

export default function About() {
  return (
    <section id="sobre" className="py-28 bg-[#FDFAF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-20">
          <AnimateIn animation="fade">
            <span className="section-label">Quem Somos</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light mt-4 mb-5 max-w-xl"
              style={{ fontFamily: "var(--font-cormorant), serif", color: "#4A1820" }}
            >
              Sobre a{" "}
              <em className="italic font-normal" style={{ color: "#C8737A" }}>
                Clínica Débora
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto" />
          </AnimateIn>
        </div>

        {/* Content grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          {/* Photo */}
          <AnimateIn animation="left" delay={100}>
            <div className="relative">
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(200,115,122,0.18)]">
                <Image
                  src="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80"
                  alt="Tratamento estético na Clínica Débora"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(200,115,122,0.06) 0%, rgba(201,151,58,0.04) 100%)",
                  }}
                />
              </div>

              {/* Floating quote card */}
              <div
                className="absolute bottom-6 left-0 right-0 mx-4 bg-white/92 backdrop-blur-md rounded-xl p-5 shadow-lg"
                style={{ border: "1px solid #F9C7CE" }}
              >
                <div className="gold-line mb-3" />
                <p
                  className="italic font-light leading-6"
                  style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "17px", color: "#8B3A42" }}
                >
                  "Cada cliente merece sair se sentindo a melhor versão de si mesma."
                </p>
                <p
                  className="mt-2 uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "9px", color: "#C9973A" }}
                >
                  Débora Silva — Fundadora
                </p>
              </div>

              {/* Decorative rings */}
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full"
                style={{ border: "1.5px solid rgba(201,151,58,0.3)" }}
              />
              <div
                className="absolute -top-4 -left-4 w-16 h-16 rounded-full"
                style={{ border: "1px solid rgba(200,115,122,0.25)" }}
              />
            </div>
          </AnimateIn>

          {/* Text */}
          <AnimateIn animation="right" delay={200}>
            <div>
              <p
                className="text-base font-light leading-8 mb-6"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
              >
                Fundada há mais de 15 anos por Débora Silva, a Clínica Débora
                nasceu do sonho de criar um espaço onde cada cliente se sinta
                verdadeiramente cuidada. Localizada no coração de São Paulo,
                nossa clínica combina técnicas estéticas avançadas com um
                ambiente de acolhimento e sofisticação.
              </p>
              <p
                className="text-base font-light leading-8 mb-8"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
              >
                Nossa equipe de profissionais altamente especializadas se dedica
                a oferecer tratamentos personalizados que respeitam a
                individualidade de cada pele e corpo. Utilizamos apenas produtos
                de alta performance e equipamentos de última geração para
                garantir resultados seguros e duradouros.
              </p>

              <div className="flex flex-col gap-4">
                {[
                  "Profissionais com certificação internacional",
                  "Produtos veganos e livres de crueldade animal",
                  "Protocolo de higiene e segurança certificado",
                  "Ambiente adaptado para portadores de necessidades especiais",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                      style={{ background: "#C9973A" }}
                    />
                    <span
                      className="text-sm font-light leading-relaxed"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>

        {/* Mission / Vision / Values */}
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <AnimateIn key={p.title} animation="up" delay={i * 150 as any}>
              <div
                className="hover-lift p-8 rounded-2xl relative overflow-hidden group"
                style={{ background: p.bg, border: `1px solid ${p.border}` }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "linear-gradient(135deg,rgba(200,115,122,0.04),rgba(201,151,58,0.04))" }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: p.gradient }}
                >
                  <p.icon size={20} className="text-white" />
                </div>
                <h3
                  className="text-2xl font-light mb-3"
                  style={{ fontFamily: "var(--font-cormorant), serif", color: "#4A1820" }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-sm font-light leading-7"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
                >
                  {p.text}
                </p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
