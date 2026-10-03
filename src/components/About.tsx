import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { paragraphs as toParagraphs, type SiteContent } from "@/lib/site-content";

const numerals = ["I", "II", "III", "IV", "V", "VI"];

export default function About({ content: c }: { content: SiteContent["about"] }) {
  const pillars = c.pillars
    .filter((p) => p.title.trim() || p.text.trim());
  const paragraphs = toParagraphs(c.text);

  return (
    <section id="sobre" className="py-28 bg-[#FDFAF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-20">
          <AnimateIn animation="fade">
            <span className="section-label">{c.eyebrow}</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light mt-4 mb-5 max-w-xl"
              style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
            >
              {c.title}{" "}
              <em className="italic font-normal" style={{ color: "#9A6F1E" }}>
                {c.title_highlight}
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
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(154,111,30,0.18)]">
                <Image
                  src={c.image}
                  alt={`Espaço da ${c.quote_author || c.title_highlight}`}
                  fill
                  className="object-contain"
                  style={{ background: "#FDFAF7" }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(154,111,30,0.06) 0%, rgba(201,151,58,0.04) 100%)",
                  }}
                />
              </div>

              {/* Quote card below image */}
              {c.quote && <div
                className="mt-4 mx-1 bg-white/92 backdrop-blur-md rounded-xl p-5 shadow-lg"
                style={{ border: "1px solid #EEDFBF" }}
              >
                <div className="gold-line mb-3" />
                <p
                  className="italic font-light leading-6"
                  style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "17px", color: "#6B4A10" }}
                >
                  “{c.quote}”
                </p>
                <p
                  className="mt-2 uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-lato), sans-serif", fontSize: "9px", color: "#C9973A" }}
                >
                  {c.quote_author}
                </p>
              </div>}

              {/* Decorative rings */}
              <div
                className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full"
                style={{ border: "1.5px solid rgba(201,151,58,0.3)" }}
              />
              <div
                className="absolute -top-4 -left-4 w-16 h-16 rounded-full"
                style={{ border: "1px solid rgba(154,111,30,0.25)" }}
              />
            </div>
          </AnimateIn>

          {/* Text */}
          <AnimateIn animation="right" delay={200}>
            <div>
              {paragraphs.map((t, i) => (
                <p
                  key={i}
                  className={`text-base font-light leading-8 ${i === paragraphs.length - 1 ? "mb-8" : "mb-6"}`}
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
                >
                  {t}
                </p>
              ))}

              <div className="flex flex-col gap-4">
                {c.bullets.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                      style={{ background: "#C9973A" }}
                    />
                    <span
                      className="text-sm font-light leading-relaxed"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
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
        <div
          className={`grid border-y divide-y md:divide-y-0 md:divide-x divide-[#EEDFBF] border-[#EEDFBF] ${pillars.length >= 3 ? "md:grid-cols-3" : pillars.length === 2 ? "md:grid-cols-2" : ""}`}
        >
          {pillars.map((p, i) => {
            const lines = p.text.split("\n").map((l) => l.trim()).filter(Boolean);
            return (
              <AnimateIn key={i} animation="up" delay={i * 120} className="py-10 md:py-12 md:px-10 md:first:pl-0 md:last:pr-0">
                <div>
                  <div className="flex items-baseline gap-4 mb-6">
                    <span
                      className="italic text-lg"
                      style={{ fontFamily: "var(--font-cormorant), serif", color: "#C9973A" }}
                    >
                      {numerals[i] ?? i + 1}.
                    </span>
                    <h3
                      className="text-3xl font-light tracking-wide"
                      style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
                    >
                      {p.title}
                    </h3>
                  </div>
                  {lines.length > 1 ? (
                    <ul className="flex flex-col">
                      {lines.map((l, j) => (
                        <li
                          key={j}
                          className="italic text-xl leading-9"
                          style={{ fontFamily: "var(--font-cormorant), serif", color: "#6B4A10" }}
                        >
                          {l}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      className="text-[15px] font-light leading-7"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
                    >
                      {p.text}
                    </p>
                  )}
                </div>
              </AnimateIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
