"use client";

import { AtSign, Phone, Mail, MapPin, Heart } from "lucide-react";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre Nós", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Equipe", href: "#equipe" },
  { label: "Blog", href: "#blog" },
  { label: "Contato", href: "#contato" },
];

const servicesList = [
  "Limpeza de Pele",
  "Microagulhamento",
  "Peeling Químico",
  "Drenagem Linfática",
  "Ventosaterapia",
  "Massagem Relaxante",
];

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #2C1A1E 0%, #1A0E10 100%)" }}
    >
      {/* Decorative top border */}
      <div
        className="w-full h-px"
        style={{ background: "linear-gradient(90deg, transparent, #C9973A, #E8C882, #C9973A, transparent)" }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-5">
              <div
                className="text-2xl font-light tracking-wide text-rose-200 mb-0.5"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Clínica Débora
              </div>
              <div
                className="text-[9px] tracking-[0.3em] uppercase"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
              >
                Estética &amp; Bem-Estar
              </div>
            </div>
            <div
              className="w-10 h-px mb-5"
              style={{ background: "linear-gradient(90deg,#C9973A,transparent)" }}
            />
            <p
              className="text-sm font-light leading-7 text-rose-200/60 mb-6"
              style={{ fontFamily: "var(--font-lato), sans-serif" }}
            >
              Cuidamos da sua beleza com técnica, dedicação e o carinho que você
              merece. Cada atendimento é uma experiência única.
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {[
                { icon: AtSign, href: "https://instagram.com/deborasilvaesteticaebemestar", label: "Instagram" },
                { icon: Phone, href: "https://wa.me/5511984271714", label: "WhatsApp" },
                { icon: Mail, href: "mailto:contato@clinicadebora.com.br", label: "Email" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#C9973A",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(200,115,122,0.2)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#C8737A";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  <s.icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-[10px] tracking-[0.25em] uppercase mb-5"
              style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
            >
              Navegação
            </h4>
            <ul className="flex flex-col gap-2.5">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-sm font-light text-rose-200/60 hover:text-rose-200 transition-colors duration-200"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4
              className="text-[10px] tracking-[0.25em] uppercase mb-5"
              style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
            >
              Serviços
            </h4>
            <ul className="flex flex-col gap-2.5">
              {servicesList.map((s) => (
                <li key={s}>
                  <a
                    href="#servicos"
                    className="text-sm font-light text-rose-200/60 hover:text-rose-200 transition-colors duration-200"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-[10px] tracking-[0.25em] uppercase mb-5"
              style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
            >
              Contato
            </h4>
            <div className="flex flex-col gap-4">
              {[
                { icon: MapPin, text: "Rua Yilidio Figueiredo, 468\nCentro de Perus — São Paulo, SP" },
                { icon: Phone, text: "(11) 98427-1714\nSeg–Sex 9h–19h | Sáb 9h–14h" },
                { icon: Mail, text: "contato@clinicadebora.com.br" },
              ].map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <item.icon
                    size={14}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "#C9973A" }}
                  />
                  <p
                    className="text-sm font-light text-rose-200/60 whitespace-pre-line leading-6"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-14 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-[11px] font-light text-rose-200/40"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            © {new Date().getFullYear()} Clínica Débora. Todos os direitos reservados.
          </p>
          <p
            className="flex items-center gap-1.5 text-[11px] font-light text-rose-200/40"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            Feito com <Heart size={10} className="text-rose-500 fill-rose-500" /> em São Paulo
          </p>
        </div>
      </div>
    </footer>
  );
}
