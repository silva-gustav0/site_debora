"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Início",    hash: "inicio"      },
  { label: "Sobre",     hash: "sobre"       },
  { label: "Serviços",  hash: "servicos"    },
  { label: "Equipe",    hash: "equipe"      },
  { label: "Blog",      hash: "blog"        },
  { label: "Contato",   hash: "contato"     },
];

export default function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname              = usePathname();
  const isHome                = pathname === "/";

  // Build the correct href: on the homepage use anchor-only (#section),
  // on any other page use absolute path (/#section) so the browser
  // navigates home first and then scrolls to the section.
  const href = (hash: string) => (isHome ? `#${hash}` : `/#${hash}`);

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
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[72px]">

            {/* Logo */}
            <a href={href("inicio")} className="flex flex-col leading-none group">
              <span
                className="text-[22px] font-semibold tracking-wide"
                style={{ fontFamily: "var(--font-cormorant), serif", color: "#8B3A42" }}
              >
                Clínica Débora
              </span>
              <span
                className="text-[9px] font-light tracking-[0.3em] uppercase transition-opacity group-hover:opacity-70"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
              >
                Estética &amp; Bem-Estar
              </span>
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.hash}
                  href={href(l.hash)}
                  className="text-[12px] font-light tracking-[0.15em] uppercase hover:text-rose-500 transition-colors duration-200 relative group"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4C52" }}
                >
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-rose-400 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </nav>

            {/* CTA */}
            <a href={href("agendamento")} className="hidden md:block btn-primary">
              Agendar
            </a>

            {/* Hamburger */}
            <button
              className="md:hidden p-2"
              style={{ color: "#8B3A42" }}
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
          <div
            className="flex items-center justify-between px-6 h-[72px] border-b"
            style={{ borderColor: "#FFE8ED" }}
          >
            <span
              className="text-[22px] font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-cormorant), serif", color: "#8B3A42" }}
            >
              Clínica Débora
            </span>
            <button
              className="p-2"
              style={{ color: "#8B3A42" }}
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-6 pt-8 flex-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.hash}
                href={href(l.hash)}
                onClick={() => setOpen(false)}
                className="py-4 text-[18px] font-light tracking-[0.05em] border-b hover:text-rose-500 transition-colors"
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  color: "#2C1A1E",
                  borderColor: "#FFF5F7",
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="px-6 pb-12">
            <a
              href={href("agendamento")}
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
