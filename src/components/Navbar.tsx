"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogIn, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Início",    hash: "inicio"      },
  { label: "Sobre",     hash: "sobre"       },
  { label: "Serviços",  hash: "servicos"    },
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
    ? "bg-[#FDFAF7]/95 backdrop-blur-md shadow-[0_2px_24px_rgba(154,111,30,0.1)]"
    : "bg-transparent";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${navBg}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-[72px]">

            {/* Logo */}
            <a href={href("inicio")} className="flex items-center group">
              <Image
                src="/images/clinica/logo.png"
                alt="Clínica Débora Silva"
                width={1052}
                height={577}
                priority
                className="h-16 w-auto transition-opacity group-hover:opacity-80"
              />
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.hash}
                  href={href(l.hash)}
                  className="text-[12px] font-light tracking-[0.15em] uppercase hover:text-bronze-500 transition-colors duration-200 relative group"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
                >
                  {l.label}
                  <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-bronze-400 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </nav>

            {/* Área da equipe + CTA */}
            <div className="hidden md:flex items-center gap-5">
              <Link
                href="/painel"
                className="flex items-center gap-1.5 text-[12px] font-light tracking-[0.15em] uppercase hover:text-bronze-500 transition-colors duration-200"
                style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
              >
                <LogIn size={14} /> Área da equipe
              </Link>
              <a href={href("agendamento")} className="btn-primary">
                Agendar
              </a>
            </div>

            {/* Hamburger */}
            <button
              className="md:hidden p-2"
              style={{ color: "#6B4A10" }}
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
            style={{ borderColor: "#F6EEDB" }}
          >
            <Image
              src="/images/clinica/logo.png"
              alt="Clínica Débora Silva"
              width={1052}
              height={577}
              className="h-12 w-auto"
            />
            <button
              className="p-2"
              style={{ color: "#6B4A10" }}
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
                className="py-4 text-[18px] font-light tracking-[0.05em] border-b hover:text-bronze-500 transition-colors"
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  color: "#2B221B",
                  borderColor: "#FBF7EE",
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="px-6 pb-12 flex flex-col gap-4">
            <Link
              href="/painel"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 py-3 text-[13px] tracking-[0.1em] uppercase"
              style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B4A10" }}
            >
              <LogIn size={16} /> Área da equipe
            </Link>
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
