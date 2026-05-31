import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { teamMembers } from "@/lib/data";

const teamPhotos: Record<string, string> = {
  debora:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
  ana:
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=400&q=80",
  mariana:
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
  juliana:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
};

export default function Team() {
  return (
    <section id="equipe" className="py-28 bg-[#FDFAF7] overflow-hidden">
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
          <AnimateIn animation="up" delay={300}>
            <p
              className="text-base font-light max-w-md leading-7"
              style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
            >
              Uma equipe apaixonada pelo que faz, unida pelo compromisso com a
              excelência e pelo cuidado genuíno com cada cliente.
            </p>
          </AnimateIn>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <AnimateIn key={member.id} animation="up" delay={i * 120 as any}>
              <div
                className="hover-lift group rounded-2xl overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid #F9C7CE",
                  boxShadow: "0 2px 20px rgba(200,115,122,0.07)",
                }}
              >
                {/* Photo */}
                <div className="relative h-60 overflow-hidden">
                  <Image
                    src={teamPhotos[member.id]}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  {/* Brand color overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                    style={{
                      background: `linear-gradient(160deg, ${member.color}20 0%, transparent 60%)`,
                    }}
                  />
                  {/* Bottom gradient for text readability */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-16"
                    style={{
                      background: "linear-gradient(to top, rgba(44,26,30,0.25), transparent)",
                    }}
                  />
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3
                    className="text-xl font-light mb-0.5"
                    style={{ fontFamily: "var(--font-cormorant), serif", color: "#4A1820" }}
                  >
                    {member.name}
                  </h3>
                  <p
                    className="text-[10.5px] tracking-widest uppercase mb-4"
                    style={{
                      fontFamily: "var(--font-lato), sans-serif",
                      color: member.color,
                    }}
                  >
                    {member.role}
                  </p>

                  <p
                    className="text-[13px] font-light leading-6 mb-5"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
                  >
                    {member.bio}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1.5">
                    {member.specialties.map((sp) => (
                      <span
                        key={sp}
                        className="text-[9.5px] px-2.5 py-1 rounded-full tracking-wide"
                        style={{
                          fontFamily: "var(--font-lato), sans-serif",
                          background: `${member.color}12`,
                          color: member.color,
                          border: `1px solid ${member.color}30`,
                        }}
                      >
                        {sp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
