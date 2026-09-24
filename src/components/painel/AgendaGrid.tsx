import Link from "next/link";
import { Globe, Package, Lock } from "lucide-react";
import { STATUS_STYLE } from "./ui";
import { dateSP, fmtDate, fmtTime, fmtWeekday } from "@/lib/format";
import { dayHours, toHHMM, toMinutes } from "@/lib/hours";
import type { AppointmentWithRefs, BusinessHours, TimeBlock } from "@/lib/types";

const PPM = 1.1; // pixels por minuto
const minuteOf = (iso: string) => toMinutes(fmtTime(iso));

type Placed = { appt: AppointmentWithRefs; start: number; end: number; lane: number; lanes: number };

/** Distribui atendimentos sobrepostos em colunas lado a lado. */
function layout(appts: AppointmentWithRefs[]): Placed[] {
  const items = appts
    .map((a) => ({ appt: a, start: minuteOf(a.starts_at), end: Math.max(minuteOf(a.ends_at), minuteOf(a.starts_at) + 15), lane: 0, lanes: 1 }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(...cluster.map((c) => c.lane)) + 1;
    cluster.forEach((c) => (c.lanes = lanes));
    cluster = [];
  };
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    it.lane = lane;
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  if (cluster.length) flush();
  return items;
}

export default function AgendaGrid({
  days, appts, blocks, hours, today, nowMin, step, hrefFor,
}: {
  days: string[];
  appts: AppointmentWithRefs[];
  blocks: TimeBlock[];
  hours: BusinessHours;
  today: string;
  nowMin: number;
  step: number;
  hrefFor: (params: Record<string, string>) => string;
}) {
  // Janela visível: do menor horário de abertura ao maior fechamento (e atendimentos fora dele).
  let start = 24 * 60, end = 0;
  for (const d of days) {
    const h = dayHours(d, hours);
    if (h) { start = Math.min(start, toMinutes(h.open)); end = Math.max(end, toMinutes(h.close)); }
  }
  for (const a of appts) { start = Math.min(start, minuteOf(a.starts_at)); end = Math.max(end, minuteOf(a.ends_at)); }
  if (start >= end) { start = 8 * 60; end = 20 * 60; }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  const height = (end - start) * PPM;
  const y = (min: number) => (min - start) * PPM;
  const hoursList = Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60);

  const byDay = new Map<string, AppointmentWithRefs[]>();
  for (const a of appts) {
    const k = dateSP(a.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }

  return (
    <div className="p-card overflow-x-auto">
      <div style={{ minWidth: days.length > 1 ? 880 : undefined }}>
        {/* Cabeçalho dos dias */}
        <div className="grid sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#F0E7DA]" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => {
            const list = (byDay.get(d) ?? []).filter((a) => a.status !== "cancelado");
            const isToday = d === today;
            return (
              <Link key={d} href={hrefFor({ view: "dia", d })} scroll={false} className="px-3 py-3 border-l border-[#F5EEE3] hover:bg-[#FDFAF5] transition-colors">
                <p className={`text-[10.5px] uppercase tracking-[0.18em] font-bold ${isToday ? "text-[#9A6F1E]" : "text-[#9A8B78]"}`}>{fmtWeekday(d)}</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`p-display text-[1.7rem] leading-none ${isToday ? "text-white rounded-full w-9 h-9 inline-flex items-center justify-center" : "text-[#2B221B]"}`}
                    style={isToday ? { background: "linear-gradient(135deg,#9A6F1E,#6B4A10)", fontSize: "1.25rem" } : undefined}
                  >
                    {Number(d.slice(8))}
                  </span>
                  <span className="text-[11px] text-[#857566]">{list.length ? `${list.length} atend.` : dayHours(d, hours) ? "livre" : "fechado"}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Grade */}
        <div className="grid relative pt-3 pb-2" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="relative" style={{ height }}>
            {hoursList.map((m) => (
              <span key={m} className="absolute right-2 -translate-y-1/2 text-[10.5px] text-[#A69885] p-num" style={{ top: y(m) }}>
                {m < end ? toHHMM(m) : ""}
              </span>
            ))}
          </div>

          {days.map((d) => {
            const h = dayHours(d, hours);
            const open = h ? toMinutes(h.open) : null;
            const close = h ? toMinutes(h.close) : null;
            const bs = h?.break_start ? toMinutes(h.break_start) : null;
            const be = h?.break_end ? toMinutes(h.break_end) : null;
            const placed = layout(byDay.get(d) ?? []);
            const dayBlocks = blocks.filter((b) => dateSP(b.starts_at) <= d && dateSP(b.ends_at) >= d);
            const slots: number[] = [];
            if (open !== null && close !== null) for (let t = open; t < close; t += step) if (!(bs !== null && be !== null && t >= bs && t < be)) slots.push(t);

            return (
              <div key={d} className="relative border-l border-[#F5EEE3]" style={{ height }}>
                {hoursList.map((m) => <div key={m} className="cal-hour-line" style={{ top: y(m) }} />)}
                {hoursList.slice(0, -1).map((m) => <div key={`h${m}`} className="cal-half-line" style={{ top: y(m + 30) }} />)}

                {/* Fora do expediente */}
                {open === null ? (
                  <div className="cal-closed flex items-start justify-center pt-6 text-xs text-[#A69885]" style={{ top: 0, height }}>Fechado</div>
                ) : (
                  <>
                    <div className="cal-closed" style={{ top: 0, height: y(open) }} />
                    <div className="cal-closed" style={{ top: y(close!), height: height - y(close!) }} />
                    {bs !== null && be !== null && (
                      <div className="cal-closed flex items-center justify-center text-[10.5px] text-[#A69885]" style={{ top: y(bs), height: (be - bs) * PPM }}>Intervalo</div>
                    )}
                  </>
                )}

                {/* Horários livres clicáveis */}
                {slots.map((t) => (
                  <Link
                    key={t}
                    href={hrefFor({ novo: "1", date: d, time: toHHMM(t) })}
                    scroll={false}
                    className="absolute left-0 right-0 z-[1] group"
                    style={{ top: y(t), height: step * PPM }}
                    aria-label={`Agendar ${fmtDate(d, { year: undefined })} às ${toHHMM(t)}`}
                  >
                    <span className="hidden group-hover:flex h-full mx-1 rounded-md items-center px-2 text-[11px] text-[#82590F] bg-[#FAF3E6] border border-dashed border-[#E8D3A6]">
                      + {toHHMM(t)}
                    </span>
                  </Link>
                ))}

                {/* Bloqueios */}
                {dayBlocks.map((b) => {
                  const s = dateSP(b.starts_at) < d ? start : Math.max(minuteOf(b.starts_at), start);
                  const e = dateSP(b.ends_at) > d ? end : Math.min(minuteOf(b.ends_at), end);
                  if (e <= s) return null;
                  return (
                    <Link
                      key={b.id}
                      href={hrefFor({ bloqueio: b.id })}
                      scroll={false}
                      className="cal-block z-[2] flex items-start gap-1"
                      style={{ top: y(s), height: (e - s) * PPM }}
                      title={b.reason}
                    >
                      <Lock size={11} className="mt-0.5 shrink-0" /> <span className="truncate">{b.reason}</span>
                    </Link>
                  );
                })}

                {/* Atendimentos */}
                {placed.map(({ appt, start: s, end: e, lane, lanes }) => {
                  const st = STATUS_STYLE[appt.status];
                  const faded = appt.status === "cancelado" || appt.status === "faltou";
                  const hgt = Math.max((e - s) * PPM - 2, 22);
                  return (
                    <Link
                      key={appt.id}
                      href={hrefFor({ a: appt.id })}
                      scroll={false}
                      className="cal-event z-[3]"
                      style={{
                        top: y(s) + 1,
                        height: hgt,
                        left: `calc(${(lane / lanes) * 100}% + 3px)`,
                        width: `calc(${100 / lanes}% - 6px)`,
                        right: "auto",
                        background: st.bg,
                        color: st.fg,
                        borderLeft: `3px solid ${st.bd}`,
                        opacity: faded ? 0.55 : 1,
                        textDecoration: appt.status === "cancelado" ? "line-through" : "none",
                      }}
                    >
                      <span className="flex items-center gap-1 font-bold p-num">
                        {fmtTime(appt.starts_at)}
                        {appt.client_package_id && <Package size={10} aria-label="Pacote" />}
                        {appt.source === "site" && <Globe size={10} aria-label="Pelo site" />}
                      </span>
                      <span className="block truncate">{appt.clients?.name ?? "—"}</span>
                      {hgt > 50 && <span className="block truncate opacity-75">{appt.services?.name}</span>}
                    </Link>
                  );
                })}

                {d === today && nowMin > start && nowMin < end && <div className="cal-now" style={{ top: y(nowMin) }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
