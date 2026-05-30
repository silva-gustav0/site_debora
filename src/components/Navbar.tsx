"use client";

import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

const links = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Equipe", href: "#equipe" },
  { label: "Blog", href: "#blog" },
  { label: "Contato", href: "#contato" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBg = scrolled
    ? "bg-[#FDFAF7]/95 backdrop-blur-md shadow-[0_2px_24px_rgba(200,115,122,0.1)]"
    : "bg-transparent";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[72px]">
            {/* Logo */}
            <a href="#inicio" className="flex flex-col leading-none group">
              <span
                className="text-[22px] font-semibold tracking-wide text-rose-700"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Clínica Débora
              </span>
              <span
                className="text-[9px] font-light tracking-[0.3em] uppercase text-gold-500 transition-opacity group-hover:opacity-70"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Estética &amp; Bem-Estar
              </span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-[12px] font-light tracking-[0.15em] uppercase text-text-secondary hover:text-rose-500 transition-colors duration-200 relative group"
                  style={{ fontFamily: "var(--font-lato), sans-serif" }}
                >
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-rose-400 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </nav>

            {/* CTA */}
            <a href="#agendamento" className="hidden md:block btn-primary">
              Agendar
            </a>

            {/* Hamburger */}
            <button
              className="md:hidden p-2 text-rose-700"
              onClick={() => setOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {open && (
        <div className="mobile-nav-enter fixed inset-0 z-[100] bg-[#FDFAF7] flex flex-col">
          <div className="flex items-center justify-between px-6 h-[72px] border-b border-rose-100">
            <span
              className="text-[22px] font-semibold tracking-wide text-rose-700"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Clínica Débora
            </span>
            <button
              className="p-2 text-rose-700"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-6 pt-8 flex-1">
            {links.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-4 text-[18px] font-light tracking-[0.05em] text-text-primary border-b border-rose-50 hover:text-rose-500 transition-colors"
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  animationDelay: `${i * 40}ms`,
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="px-6 pb-12">
            <a
              href="#agendamento"
              onClick={() => setOpen(false)}
              className="btn-primary w-full justify-center"
            >
              Agendar Consulta
            </a>
          </div>
        </div>
      )}
    </>
  );
}
