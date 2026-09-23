import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Avatar, StatusBadge, STATUS_BORDER } from "./ui";
import { dateSP, fmtDate, fmtTime } from "@/lib/format";
import type { AppointmentWithRefs } from "@/lib/types";

/** Linha compacta de atendimento; abre o painel do atendimento na agenda. */
export default function AppointmentItem({ appt, showDate = false }: { appt: AppointmentWithRefs; showDate?: boolean }) {
  const day = dateSP(appt.starts_at);
  const faded = appt.status === "cancelado" || appt.status === "faltou";
  return (
    <Link
      href={`/painel/agenda?d=${day}&a=${appt.id}`}
      className={`group flex items-center gap-3 rounded-xl bg-white border border-[#F1E5E2] px-3 py-2.5 transition-all hover:border-[#E3C4C8] hover:shadow-[0_8px_20px_-14px_rgba(44,26,30,.4)] ${faded ? "opacity-60" : ""}`}
      style={{ borderLeft: `3px solid ${STATUS_BORDER[appt.status]}` }}
    >
      <div className="w-14 shrink-0 p-num">
        {showDate && <span className="block text-[11px] text-[#8F7479]">{fmtDate(day, { year: undefined })}</span>}
        <span className="text-[15px] font-bold text-[#2C1A1E]">{fmtTime(appt.starts_at)}</span>
      </div>
      {appt.clients && <Avatar name={appt.clients.name} size={32} />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2C1A1E] truncate">{appt.clients?.name ?? "Cliente removida"}</p>
        <p className="text-xs text-[#8F7479] truncate flex items-center gap-1">
          {appt.client_package_id && <Package size={11} className="text-[#C9973A]" />}
          {appt.services?.name}
        </p>
      </div>
      <StatusBadge status={appt.status} />
      <ChevronRight size={15} className="text-[#C7AFB3] group-hover:text-[#8B3A42] transition-colors" />
    </Link>
  );
}
