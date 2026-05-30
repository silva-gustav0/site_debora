import AnimateIn from "./AnimateIn";
import { teamMembers } from "@/lib/data";

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
              className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
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
              className="text-base font-light text-text-secondary max-w-md leading-7"
              style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
                {/* Avatar area */}
                <div
                  className="h-52 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(160deg, ${member.color}15 0%, ${member.color}30 100%)`,
                  }}
                >
                  {/* Decorative ring */}
                  <div
                    className="absolute w-36 h-36 rounded-full opacity-20"
                    style={{ border: `1.5px solid ${member.color}` }}
                  />
                  <div
                    className="absolute w-28 h-28 rounded-full opacity-15"
                    style={{ border: `1px solid ${member.color}` }}
                  />

                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-light shadow-lg z-10"
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      background: `linear-gradient(135deg, ${member.color}, ${member.color}CC)`,
                      fontSize: "28px",
                    }}
                  >
                    {member.initials}
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3
                    className="text-xl font-light text-rose-800 mb-0.5"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
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
                    className="text-[13px] font-light leading-6 text-text-secondary mb-5"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
