import type {
  AppointmentStatus,
  ClientSource,
  ClientStage,
  InteractionKind,
  PaymentMethod,
} from "./types";

export const TZ = "America/Sao_Paulo";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const brl = (n: number | string | null | undefined) => brlFmt.format(Number(n ?? 0));

/** Data de hoje em São Paulo, no formato YYYY-MM-DD. */
export function todaySP(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Converte um instante para YYYY-MM-DD em São Paulo. */
export function dateSP(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string) {
  const a = Date.parse(`${from}T12:00:00Z`);
  const b = Date.parse(`${to}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Dia da semana (0 = domingo) de uma data YYYY-MM-DD. */
export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function fmtDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const d = typeof value === "string" && value.length === 10 ? new Date(`${value}T12:00:00Z`) : new Date(value);
  const tz = typeof value === "string" && value.length === 10 ? "UTC" : TZ;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric", ...opts }).format(d);
}

export function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Primeira letra maiúscula (o CSS `capitalize` capitalizaria cada palavra). */
export const ucfirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function fmtWeekday(date: string, style: "short" | "long" = "short") {
  const s = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: style }).format(new Date(`${date}T12:00:00Z`));
  return ucfirst(s.replace(".", ""));
}

export const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export function formatPhone(phone: string | null | undefined) {
  const d = digits(phone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone ?? "";
}

/** Máscara progressiva para inputs de telefone. */
export function maskPhone(value: string) {
  const d = digits(value).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  let d = digits(phone);
  if (!d) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  solicitado: "Solicitado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

export const STAGE_LABEL: Record<ClientStage, string> = {
  lead: "Lead",
  em_contato: "Em contato",
  cliente: "Cliente",
  vip: "VIP",
  inativa: "Inativo",
};

export const SOURCE_LABEL: Record<ClientSource, string> = {
  site: "Site",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  passante: "Passante",
  outro: "Outro",
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  credito: "Crédito",
  debito: "Débito",
  transferencia: "Transferência",
  outro: "Outro",
};

export const INTERACTION_LABEL: Record<InteractionKind, string> = {
  nota: "Nota",
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  mensagem_site: "Mensagem do site",
  followup: "Follow-up",
};

/** Preenche um modelo de mensagem: {nome}, {servico}, {data}, {hora}, {clinica}, {link}. */
export function fillTemplate(template: string, vars: Partial<Record<"nome" | "servico" | "data" | "hora" | "clinica" | "link", string>>) {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (vars as Record<string, string | undefined>)[k] ?? m);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "Setembro de 2026" (long) ou "set" (short). */
export const monthName = (ym: string, style: "long" | "short" = "long") =>
  ucfirst(
    new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: style, ...(style === "long" ? { year: "numeric" } : {}) })
      .format(new Date(`${ym}-15T12:00:00Z`))
      .replace(".", ""),
  );

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export const lastDayOfMonth = (ym: string) => addDays(`${shiftMonth(ym, 1)}-01`, -1);

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Instante atual em ms (isolado para uso em Server Components). */
export const nowMs = () => Date.now();
