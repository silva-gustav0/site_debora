import { todaySP } from "@shared/format";
import { getRandomBytes } from "expo-crypto";

// Lógica pura copiada de ../src/lib/vouchers.ts (aquele arquivo é só do servidor).
export const VOUCHER_MIN = 50;
export const VOUCHER_MAX = 2000;
const VOUCHER_MONTHS = 6;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código DS-XXXX-XXXX sem 0/O e 1/I. */
export const newVoucherCode = () => {
  const bytes = getRandomBytes(8);
  const block = (o: number) => Array.from({ length: 4 }, (_, i) => ALPHABET[bytes[o + i] % ALPHABET.length]).join("");
  return `DS-${block(0)}-${block(4)}`;
};

/** Validade: hoje + 6 meses (fuso de São Paulo). */
export function voucherExpiry(today = todaySP()) {
  const [y, m, d] = today.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + VOUCHER_MONTHS, d, 12));
  if (target.getUTCDate() !== d) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

export type VoucherState = "pendente" | "ativo" | "agendado" | "usado" | "expirado" | "cancelado";

/** Estado exibido: reservado por agendamento em aberto ou expirado contam à parte. */
export function voucherState(v: { status: string; expires_on: string | null }, hasOpenAppointment: boolean, today = todaySP()): VoucherState {
  if (v.status !== "ativo") return v.status as VoucherState;
  if (hasOpenAppointment) return "agendado";
  return v.expires_on && v.expires_on < today ? "expirado" : "ativo";
}

export const STATE_LABEL: Record<VoucherState, string> = {
  pendente: "Aguardando pagamento", ativo: "Disponível", agendado: "Agendado", usado: "Usado", expirado: "Expirado", cancelado: "Cancelado",
};
