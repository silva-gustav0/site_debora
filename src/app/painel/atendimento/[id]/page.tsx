import { notFound } from "next/navigation";
import AttendanceScreen from "@/components/painel/AttendanceScreen";
import { themeFor } from "@/lib/attendance-themes";
import { requireStaff } from "@/lib/dal";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Em atendimento · Painel Débora Silva", robots: { index: false, follow: false } };

/** Tela cheia do atendimento em andamento (fora do layout com menu, pensada para o tablet). */
export default async function AttendancePage({ params }: PageProps<"/painel/atendimento/[id]">) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status, price, client_package_id, starts_at, ends_at, notes, voucher_amount, discount_pct, clients(id, name, skin_type, allergies, health_notes), services(name, category, duration_min), vouchers(code, kind, balance)")
    .eq("id", id).maybeSingle();
  if (!appt) notFound();

  const client = appt.clients as unknown as { id: string; name: string; skin_type: string | null; allergies: string | null; health_notes: string | null } | null;
  const service = appt.services as unknown as { name: string; category: string; duration_min: number } | null;
  const [settings, last] = await Promise.all([
    getSettings(supabase),
    client
      ? supabase.from("session_records").select("record_date, procedure, observations, next_steps")
          .eq("client_id", client.id).order("record_date", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const serviceName = service?.name ?? "Atendimento";
  // Voucher: mesmo cálculo de completeAppointment (quanto ele cobre e o que falta cobrar).
  const v = appt.vouchers as unknown as { code: string; kind: "servico" | "valor"; balance: number } | null;
  const price = Number(appt.price);
  const covered = !v ? 0 : appt.voucher_amount !== null ? Number(appt.voucher_amount) : v.kind === "servico" ? price : Math.min(Number(v.balance), price);
  const voucher = v ? { code: v.code, covered, due: Math.max(0, Math.round((price - covered) * 100) / 100) } : null;
  const minutes = service?.duration_min ?? Math.max(15, Math.round((Date.parse(appt.ends_at) - Date.parse(appt.starts_at)) / 60_000));

  return (
    <AttendanceScreen
      appointment={{ id: appt.id, status: appt.status, price, fromPackage: Boolean(appt.client_package_id), notes: appt.notes, voucher, discountPct: Number(appt.discount_pct) }}
      client={client}
      serviceName={serviceName}
      minutes={minutes}
      theme={themeFor(serviceName, service?.category)}
      lastSession={last.data}
      fees={{ credit: settings.fee_credit, debit: settings.fee_debit }}
    />
  );
}
