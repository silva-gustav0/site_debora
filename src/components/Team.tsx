import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { CheckCircle2 } from "lucide-react";

const qualities = [
  "Profissionais certificadas e em constante atualização técnica",
  "Atendimento individualizado com ética e empatia",
  "Protocolos seguros e produtos de qualidade comprovada",
  "Espaço dedicado exclusivamente ao público feminino",
  "Ambiente acolhedor, confortável e sofisticado",
  "Comprometimento com sua beleza e bem-estar",
];

export default function Team() {
  return (
    <section
      id="equipe"
      className="py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FDFAF7 0%, #F7F2EC 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <AnimateIn animation="fade">
            <span className="section-label">Nossa Equipe</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif", color: "#4A1820" }}
            >
              Profissionais{" "}
              <em className="italic font-normal" style={{ color: "#C8737A" }}>
                Dedicadas a Você
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto mb-6" />
          </AnimateIn>
        </div>

        {/* Content */}
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Group photo */}
          <AnimateIn animation="left" delay={100}>
            <div className="relative rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(200,115,122,0.18)]">
              <Image
                src="/images/talissa/img5.jpg"
                alt="Equipe Talissa Estética e Bem Estar"
                width={800}
                height={600}
                className="w-full h-auto"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(160deg, rgba(200,115,122,0.04) 0%, transparent 60%)",
                }}
              />
            </div>
          </AnimateIn>

          {/* Text */}
          <AnimateIn animation="right" delay={200}>
            <div>
              <p
                className="text-base font-light leading-8 mb-4"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
              >
                Nossa equipe é formada por profissionais dedicadas, capacitadas e comprometidas
                com a excelência no atendimento. Trabalhamos com ética, empatia e atendimento
                humanizado, proporcionando experiências únicas de cuidado e bem-estar.
              </p>
              <p
                className="text-base font-light leading-8 mb-8"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
              >
                Na Talissa Estética e Bem Estar, acreditamos que a qualificação contínua é
                essencial para oferecer os melhores resultados. Nossa equipe está sempre
                atualizada com as mais recentes técnicas e tecnologias do mercado.
              </p>

              <div className="flex flex-col gap-3 mb-8">
                {qualities.map((q, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2
                      size={16}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: "#C8737A" }}
                    />
                    <span
                      className="text-sm font-light leading-relaxed"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
                    >
                      {q}
                    </span>
                  </div>
                ))}
              </div>

              <a href="#agendamento" className="btn-primary">
                Agendar com Nossa Equipe
              </a>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
