import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { initials, STAGE_LABEL, STATUS_LABEL } from "@/lib/format";
import type { AppointmentStatus, ClientStage } from "@/lib/types";

export function PageHeader({
  eyebrow, title, subtitle, actions,
}: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 p-rise">
      <div>
        {eyebrow && <p className="p-eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="p-display text-[2.4rem] sm:text-5xl font-light text-[#2C1A1E] leading-[1.05]">{title}</h1>
        {subtitle && <p className="text-sm text-[#8F7479] mt-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title, eyebrow, action, children, className = "", bodyClassName = "p-5", gold = false,
}: {
  title?: ReactNode; eyebrow?: string; action?: ReactNode; children: ReactNode;
  className?: string; bodyClassName?: string; gold?: boolean;
}) {
  return (
    <section className={`p-card ${gold ? "p-card-gold" : ""} ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-[#F6ECE9]">
          <div>
            {eyebrow && <p className="p-eyebrow text-[9.5px] mb-0.5">{eyebrow}</p>}
            <h2 className="p-display text-[1.45rem] leading-tight font-normal text-[#2C1A1E]">{title}</h2>
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatTile({
  label, value, hint, icon: Icon, tone = "default", trend, href,
}: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon;
  tone?: "default" | "warn" | "dark"; trend?: number | null; href?: string;
}) {
  const dark = tone === "dark";
  const body = (
    <div
      className={`p-card px-5 py-4 h-full relative overflow-hidden ${href ? "transition-transform hover:-translate-y-0.5" : ""}`}
      style={dark ? { background: "linear-gradient(140deg,#2C1A1E 0%,#4A2830 100%)", borderColor: "#3A2228" } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[10.5px] uppercase tracking-[0.14em] font-bold ${dark ? "text-[#E8C882]" : "text-[#9C7F84]"}`}>{label}</p>
        {Icon && (
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={dark ? { background: "rgba(232,200,130,.14)", color: "#E8C882" } : { background: "#FFF3EE", color: "#B3842E" }}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      <p
        className={`p-display p-num text-[2.1rem] leading-none mt-2 ${dark ? "text-white" : tone === "warn" ? "text-[#9A5B00]" : "text-[#2C1A1E]"}`}
      >
        {value}
      </p>
      <div className={`flex items-center gap-2 text-xs mt-2 ${dark ? "text-[#E9D8D4]/70" : "text-[#8F7479]"}`}>
        {trend !== undefined && trend !== null && (
          <span
            className="font-bold rounded-full px-1.5 py-0.5 text-[10.5px]"
            style={trend >= 0 ? { background: "#E6F4EA", color: "#1F6B3A" } : { background: "#FDECEC", color: "#9B2C2C" }}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

const TONES = {
  gold:  { bg: "#FFF6DD", fg: "#7A5510", bd: "#EED9A0" },
  rose:  { bg: "#FFEFF2", fg: "#8B3A42", bd: "#F4C7CE" },
  green: { bg: "#EAF6EE", fg: "#1F6B3A", bd: "#BFE3CB" },
  gray:  { bg: "#F3F0EF", fg: "#5E5557", bd: "#E0D9D8" },
  red:   { bg: "#FDECEC", fg: "#9B2C2C", bd: "#F2C1C1" },
  blue:  { bg: "#EEF1FB", fg: "#34459A", bd: "#CBD3F0" },
  plum:  { bg: "#F6EEF8", fg: "#6B2E7A", bd: "#E1CBE8" },
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<AppointmentStatus, Tone> = {
  solicitado: "gold", confirmado: "blue", concluido: "green", cancelado: "gray", faltou: "red",
};
export const StatusBadge = ({ status }: { status: AppointmentStatus }) => (
  <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
);
/** Cores de fundo/borda dos atendimentos na grade da agenda. */
export const STATUS_STYLE: Record<AppointmentStatus, { bg: string; bd: string; fg: string }> = {
  solicitado: { bg: "#FFF4D6", bd: "#D4A73C", fg: "#5C4010" },
  confirmado: { bg: "#FBE4E8", bd: "#C8737A", fg: "#5A1F27" },
  concluido:  { bg: "#E3F2E7", bd: "#3F9A5E", fg: "#1D4D2E" },
  cancelado:  { bg: "#F1EDEC", bd: "#B8AEAF", fg: "#6E6466" },
  faltou:     { bg: "#FBE3E1", bd: "#C0504D", fg: "#7A1F1F" },
};
export const STATUS_BORDER: Record<AppointmentStatus, string> = {
  solicitado: "#D4A73C", confirmado: "#C8737A", concluido: "#3F9A5E", cancelado: "#B8AEAF", faltou: "#C0504D",
};

const STAGE_TONE: Record<ClientStage, Tone> = {
  lead: "gold", em_contato: "blue", cliente: "green", vip: "plum", inativa: "gray",
};
export const StageBadge = ({ stage }: { stage: ClientStage }) => (
  <Badge tone={STAGE_TONE[stage]}>{STAGE_LABEL[stage]}</Badge>
);

const AVATAR_BG = ["#C8737A", "#A87B25", "#8E4BA0", "#5B6FC9", "#3F9A5E", "#B85C38", "#6B4C52", "#2F7A8A"];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_BG[h % AVATAR_BG.length];
  return (
    <span
      className="p-avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${bg}, ${bg}CC)` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Tabs({ tabs, current }: { tabs: { key: string; label: ReactNode; href: string }[]; current: string }) {
  return (
    <nav className="p-tabs mb-5" aria-label="Seções">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className="p-tab" aria-current={t.key === current ? "page" : undefined} scroll={false}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Chips({ items, current }: { items: { key: string; label: ReactNode; href: string }[]; current: string }) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Filtros">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className="p-chip" aria-current={i.key === current ? "true" : undefined} scroll={false}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function EmptyState({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4 text-sm text-[#8F7479]">
      {Icon && (
        <span className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "#FFF3EE", color: "#C9973A" }}>
          <Icon size={18} />
        </span>
      )}
      {children}
    </div>
  );
}

export function Alert({ tone = "gold", children }: { tone?: "gold" | "red" | "green"; children: ReactNode }) {
  const t = tone === "red" ? TONES.red : tone === "green" ? TONES.green : TONES.gold;
  return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: t.bg, border: `1px solid ${t.bd}`, color: t.fg }}>
      {children}
    </div>
  );
}

export function Progress({ value, max, color = "#C8737A" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-[#F4E8E5] overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
