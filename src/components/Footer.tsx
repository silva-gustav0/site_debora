"use client";

import Link from "next/link";
import { AtSign, Phone, Mail, MapPin, Heart } from "lucide-react";
import { instagramUrl, telHref, type HomeService, type SiteContent } from "@/lib/site-content";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre Nós", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Blog", href: "#blog" },
  { label: "Contato", href: "#contato" },
];

type FooterProps = {
  brand: SiteContent["brand"];
  contact: SiteContent["contact"];
  footer: SiteContent["footer"];
  services: HomeService[];
  hours: string;
  showBlog?: boolean;
};

export default function Footer({ brand, contact, footer, services, hours, showBlog = true }: FooterProps) {
  const links = navLinks.filter((l) => showBlog || l.href !== "#blog");
  const social = [
    { icon: AtSign, href: contact.instagram ? instagramUrl(contact.instagram) : null, label: "Instagram" },
    { icon: Phone, href: telHref(contact.phone), label: "Telefone" },
    { icon: Mail, href: contact.email ? `mailto:${contact.email}` : null, label: "Email" },
  ].filter((s): s is typeof s & { href: string } => Boolean(s.href));
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #2B221B 0%, #17110C 100%)" }}
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
                className="text-2xl font-light tracking-wide text-bronze-200 mb-0.5"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                {brand.name}
              </div>
              <div
                className="text-[9px] tracking-[0.3em] uppercase"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
              >
                {brand.tagline}
              </div>
            </div>
            <div
              className="w-10 h-px mb-5"
              style={{ background: "linear-gradient(90deg,#C9973A,transparent)" }}
            />
            <p
              className="text-sm font-light leading-7 text-bronze-200/60 mb-6"
              style={{ fontFamily: "var(--font-lato), sans-serif" }}
            >
              {footer.text}
            </p>
            {/* Social */}
            <div className="flex gap-3">
              {social.map((s) => (
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
                    (e.currentTarget as HTMLElement).style.background = "rgba(154,111,30,0.2)";
                    (e.currentTarget as HTMLElement).style.borderColor = "#9A6F1E";
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
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={`/${l.href}`}
                    className="text-sm font-light text-bronze-200/60 hover:text-bronze-200 transition-colors duration-200"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {l.label}
                  </Link>
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
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href="/#servicos"
                    className="text-sm font-light text-bronze-200/60 hover:text-bronze-200 transition-colors duration-200"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {s.name}
                  </Link>
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
                { icon: MapPin, text: contact.address },
                { icon: Phone, text: [contact.phone, hours].filter(Boolean).join("\n") },
                { icon: Mail, text: contact.email },
              ].filter((item) => item.text.trim()).map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <item.icon
                    size={14}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: "#C9973A" }}
                  />
                  <p
                    className="text-sm font-light text-bronze-200/60 whitespace-pre-line leading-6"
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
            className="text-[11px] font-light text-bronze-200/40"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            © {new Date().getFullYear()} {brand.full_name}. Todos os direitos reservados.
          </p>
          <p
            className="flex items-center gap-1.5 text-[11px] font-light text-bronze-200/40"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            Feito com <Heart size={10} className="text-bronze-500 fill-bronze-500" /> em {footer.made_in}
            <span aria-hidden="true" className="mx-1">·</span>
            <a href="/painel" className="hover:text-bronze-200 transition-colors">Área da equipe</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
