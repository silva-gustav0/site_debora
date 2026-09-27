import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { BG_COLORS, paragraphs, type CustomSection as Section } from "@/lib/site-content";

/** Seção criada no painel, com o mesmo visual das seções fixas e a foto na posição escolhida. */
export default function CustomSection({ s }: { s: Section }) {
  const pos = s.image ? s.image_position : "none";
  const side = pos === "left" || pos === "right";
  const photo = s.image && pos !== "background" && pos !== "none" && (
    <AnimateIn animation={pos === "left" ? "left" : pos === "right" ? "right" : "up"} delay={100} className={side ? (pos === "right" ? "lg:order-2" : "") : "max-w-4xl w-full mx-auto"}>
      <div className={`relative w-full ${side ? "aspect-[4/3]" : "aspect-[16/9]"} rounded-2xl overflow-hidden shadow-[0_24px_70px_rgba(154,111,30,0.18)]`}>
        <Image src={s.image} alt={s.title_highlight || s.title || "Foto"} fill className="object-cover" sizes={side ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 900px"} />
      </div>
    </AnimateIn>
  );
  const text = (
    <AnimateIn animation={side ? (pos === "left" ? "right" : "left") : "up"} delay={200} className={side ? "" : "max-w-3xl mx-auto text-center"}>
      {paragraphs(s.text).map((t, i) => (
        <p key={i} className="text-base font-light leading-8 mb-6 last:mb-0" style={{ fontFamily: "var(--font-lato), sans-serif", color: pos === "background" ? "#4A3C30" : "#6B5A4B" }}>{t}</p>
      ))}
    </AnimateIn>
  );

  return (
    <section id={`secao-${s.id}`} className="relative py-28 overflow-hidden" style={{ background: BG_COLORS[s.bg] }}>
      {pos === "background" && (
        <>
          <Image src={s.image} alt="" fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${BG_COLORS[s.bg]}EB 0%, ${BG_COLORS[s.bg]}D9 100%)` }} />
        </>
      )}
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        {(s.eyebrow || s.title || s.title_highlight) && (
          <div className="flex flex-col items-center text-center mb-16">
            {s.eyebrow && <AnimateIn animation="fade"><span className="section-label">{s.eyebrow}</span></AnimateIn>}
            <AnimateIn animation="up" delay={100}>
              <h2 className="text-4xl sm:text-5xl font-light mt-4 mb-5 max-w-2xl" style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}>
                {s.title}{" "}{s.title_highlight && <em className="italic font-normal" style={{ color: "#9A6F1E" }}>{s.title_highlight}</em>}
              </h2>
            </AnimateIn>
            <AnimateIn animation="scale" delay={200}><div className="gold-line mx-auto" /></AnimateIn>
          </div>
        )}
        <div className={side ? "grid lg:grid-cols-2 gap-16 items-center" : "flex flex-col gap-12"}>
          {pos !== "bottom" && photo}
          {text}
          {pos === "bottom" && photo}
        </div>
      </div>
    </section>
  );
}
