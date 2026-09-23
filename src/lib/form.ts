import type { ActionState } from "./types";

/** Helpers para ler FormData nas server actions. */
export const str = (fd: FormData, key: string, max = 500) => String(fd.get(key) ?? "").trim().slice(0, max);
export const opt = (fd: FormData, key: string, max = 500) => str(fd, key, max) || null;
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const list = (fd: FormData, key: string) => fd.getAll(key).map(String).filter(Boolean);

/** Aceita "1.234,56", "1234,56", "1234.56" e "R$ 50". */
export const money = (fd: FormData, key: string) => {
  const raw = str(fd, key, 20).replace(/\s|R\$/g, "");
  if (!raw) return NaN;
  const n = Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export const int = (fd: FormData, key: string) => {
  const n = Number(str(fd, key, 12));
  return Number.isInteger(n) ? n : NaN;
};

export const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isTime = (s: string) => /^\d{2}:\d{2}$/.test(s);
export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export const fail = (message: string): ActionState => ({ ok: false, message });
