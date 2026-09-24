"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Users, Wallet, Repeat, KanbanSquare, Sparkles, LogOut, Menu, X, ExternalLink,
  Package, Boxes, BarChart3, Settings, Search, Globe,
} from "lucide-react";
import { logout } from "@/app/painel/auth-actions";
import { initials } from "@/lib/format";

const GROUPS = [
  {
    label: "Dia a dia",
    items: [
      { href: "/painel", label: "Início", icon: LayoutDashboard },
      { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/painel/clientes", label: "Clientes", icon: Users },
    ],
  },
  {
    label: "Relacionamento",
    items: [
      { href: "/painel/crm", label: "CRM & Campanhas", icon: KanbanSquare },
      { href: "/painel/recorrencia", label: "Recorrência", icon: Repeat },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/painel/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/painel/pacotes", label: "Pacotes", icon: Package },
      { href: "/painel/estoque", label: "Estoque", icon: Boxes },
      { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Ajustes",
    items: [
      { href: "/painel/servicos", label: "Serviços", icon: Sparkles },
      { href: "/painel/site", label: "Site", icon: Globe },
      { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export type SidebarBadges = { agenda: number; estoque: number; financeiro: number };

export default function Sidebar({ name, badges }: { name: string; badges: SidebarBadges }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/painel" ? pathname === href : pathname.startsWith(href));
  const badgeFor = (href: string) =>
    href === "/painel/agenda" ? badges.agenda : href === "/painel/estoque" ? badges.estoque : href === "/painel/financeiro" ? badges.financeiro : 0;
  const totalAlerts = badges.agenda + badges.estoque + badges.financeiro;

  const content = (
    <>
      <Link href="/painel" className="flex items-center gap-3 px-3 mb-6" onClick={() => setOpen(false)}>
        <span
          className="w-10 h-10 rounded-full flex items-center justify-center p-display text-xl text-[#29201A]"
          style={{ background: "linear-gradient(135deg,#F3DDA6,#C9973A)" }}
          aria-hidden="true"
        >
          D
        </span>
        <span>
          <span className="block p-display text-[1.35rem] leading-none text-white">Débora Silva</span>
          <span className="block text-[9.5px] tracking-[0.3em] uppercase text-[#E8C882]/80 mt-1">Gestão da clínica</span>
        </span>
      </Link>

      <form action="/painel/clientes" className="relative px-1 mb-5" role="search">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          name="q"
          placeholder="Buscar cliente…"
          aria-label="Buscar cliente"
          className="w-full rounded-xl bg-white/[0.06] border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#E8C882]/60"
        />
      </form>

      <nav className="flex-1 overflow-y-auto flex flex-col gap-5" aria-label="Painel">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <p className="nav-group px-3 mb-1.5 text-[9.5px] tracking-[0.24em] uppercase font-bold">{g.label}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const count = badgeFor(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className="nav-link flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors"
                  >
                    <Icon size={16} strokeWidth={1.8} />
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <span className="rounded-full px-1.5 min-w-5 text-center text-[10.5px] font-bold text-[#29201A]" style={{ background: "#E8C882" }}>
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <span className="p-avatar w-9 h-9 text-xs" style={{ background: "linear-gradient(135deg,#9A6F1E,#6B4A10)" }}>{initials(name)}</span>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{name}</p>
            <p className="text-[11px] text-white/45">Equipe</p>
          </div>
        </div>
        <div className="flex gap-1">
          <a href="/" target="_blank" className="nav-link flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px]">
            <ExternalLink size={14} /> Site
          </a>
          <form action={logout} className="flex-1">
            <button className="nav-link w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12.5px]">
              <LogOut size={14} /> Sair
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className="panel-sidebar no-print hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col px-3 py-6 z-30">{content}</aside>

      <header className="panel-sidebar no-print lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14">
        <Link href="/painel" className="p-display text-xl text-white">Débora Silva</Link>
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2 text-white relative">
          <Menu size={22} />
          {totalAlerts > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E8C882]" />}
        </button>
      </header>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="panel-sidebar relative w-72 max-w-[85%] h-full px-3 py-5 flex flex-col">
            <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="absolute top-4 right-3 p-2 text-white/70">
              <X size={20} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
