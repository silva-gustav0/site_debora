import AnimateIn from "./AnimateIn";
import { Heart, Eye, Diamond } from "lucide-react";

const pillars = [
  {
    icon: Heart,
    title: "Missão",
    text: "Proporcionar experiências transformadoras de beleza e bem-estar, unindo ciência estética e cuidado humano para realçar a beleza autêntica de cada cliente.",
  },
  {
    icon: Eye,
    title: "Visão",
    text: "Ser a clínica de estética de referência em atendimento premium, reconhecida pela excelência técnica, ambiente acolhedor e resultados que superam expectativas.",
  },
  {
    icon: Diamond,
    title: "Valores",
    text: "Ética e transparência em cada atendimento. Compromisso com a excelência, respeito à individualidade e dedicação contínua à evolução profissional.",
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
              className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5 max-w-xl"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
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
          {/* Visual */}
          <AnimateIn animation="left" delay={100}>
            <div className="relative">
              <div
                className="w-full aspect-[4/5] rounded-2xl relative overflow-hidden"
                style={{
                  background: "linear-gradient(160deg, #FFE8ED 0%, #FFF0C4 100%)",
                }}
              >
                {/* Decorative layers */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-10"
                >
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #C8737A, #8B3A42)" }}
                  >
                    <span
                      className="text-3xl font-light italic text-white"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      CD
                    </span>
                  </div>
                  <p
                    className="text-center text-rose-800 leading-relaxed font-light italic text-lg max-w-xs"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    "Cada cliente que entra aqui merece sair se sentindo a melhor versão de si mesma."
                  </p>
                  <div className="gold-line mx-auto" />
                  <p
                    className="section-label"
                    style={{ fontSize: "9px", color: "#C9973A" }}
                  >
                    Débora Silva — Fundadora
                  </p>
                </div>
              </div>

              {/* Accent corner element */}
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #C9973A22, #E8C88222)",
                  border: "1.5px solid #E8C88280",
                }}
              />
              <div
                className="absolute -top-4 -left-4 w-16 h-16 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #C8737A1A, #F4C2C21A)",
                  border: "1px solid #F4C2C250",
                }}
              />
            </div>
          </AnimateIn>

          {/* Text */}
          <AnimateIn animation="right" delay={200}>
            <div>
              <p
                className="text-base font-light leading-8 text-text-secondary mb-6"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Fundada há mais de 15 anos por Débora Silva, a Clínica Débora
                nasceu do sonho de criar um espaço onde cada cliente se sinta
                verdadeiramente cuidada. Localizada no coração de São Paulo,
                nossa clínica combina técnicas estéticas avançadas com um
                ambiente de acolhimento e sofisticação.
              </p>
              <p
                className="text-base font-light leading-8 text-text-secondary mb-8"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
                      className="w-1 h-1 rounded-full mt-2.5 flex-shrink-0"
                      style={{ background: "#C9973A", width: "6px", height: "6px" }}
                    />
                    <span
                      className="text-sm font-light text-text-secondary leading-relaxed"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
                style={{
                  background: i === 0
                    ? "linear-gradient(135deg, #FFF5F7, #FDFAF7)"
                    : i === 1
                    ? "linear-gradient(135deg, #FFF8E7, #FDFAF7)"
                    : "linear-gradient(135deg, #FFF5F7, #FFF8E7)",
                  border: "1px solid",
                  borderColor: i === 0 ? "#F9C7CE" : i === 1 ? "#E8C882" : "#F4A6B0",
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(200,115,122,0.04), rgba(201,151,58,0.04))",
                  }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: i === 0
                      ? "linear-gradient(135deg,#C8737A,#8B3A42)"
                      : i === 1
                      ? "linear-gradient(135deg,#C9973A,#A87B25)"
                      : "linear-gradient(135deg,#C8737A,#C9973A)",
                  }}
                >
                  <p.icon size={20} className="text-white" />
                </div>
                <h3
                  className="text-2xl font-light text-rose-800 mb-3"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-sm font-light leading-7 text-text-secondary"
                  style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
