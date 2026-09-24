import { brl } from "@/lib/format";

const BRONZE = "#9A6F1E";
const GOLD = "#C9973A";
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Barras horizontais ordenadas (magnitude, uma cor). Rótulos e valores em texto. */
export function BarList({
  rows, empty = "Sem dados no período.", format = brl, color = BRONZE,
}: { rows: { label: string; value: number; hint?: string }[]; empty?: string; format?: (n: number) => string; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!rows.length || max === 0) return <p className="text-sm text-[#857566] py-6 text-center">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)} (${Math.round((r.value / total) * 100)}%)`}>
          <div className="flex justify-between gap-3 text-sm mb-1.5">
            <span className="text-[#2B221B] truncate">{r.label}{r.hint && <span className="text-[#857566] text-xs"> · {r.hint}</span>}</span>
            <span className="p-num text-[#6B5A4B] whitespace-nowrap">
              {format(r.value)} <span className="text-[#A69885] text-xs">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F5EEE3]">
            <div className="h-2 rounded-full" style={{ width: `${Math.max((r.value / max) * 100, 2)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Colunas por dia do mês. Passe o mouse para ver o valor de cada dia. */
export function DailyBars({ days, highlight }: { days: { day: number; value: number }[]; highlight?: number }) {
  const max = Math.max(...days.map((d) => d.value), 0);
  const best = days.reduce((a, b) => (b.value > a.value ? b : a), days[0]);
  return (
    <figure>
      <div className="flex items-end gap-[3px] h-40 border-b border-[#EAE0D0]" role="img" aria-label="Receita por dia do mês">
        {days.map((d) => (
          <div key={d.day} className="group relative flex-1 h-full flex items-end" title={`Dia ${d.day}: ${brl(d.value)}`}>
            <div
              className="w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
              style={{ height: max ? `${(d.value / max) * 100}%` : 0, minHeight: d.value > 0 ? 3 : 0, background: d.day === highlight ? "#6B4A10" : BRONZE }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded-md bg-[#2B221B] px-2 py-1 text-[11px] text-white z-10">
              Dia {d.day} · {brl(d.value)}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between text-[11px] text-[#857566] mt-1.5 p-num">
        <span>1</span>
        {best && best.value > 0 && <span>Melhor dia: {best.day} ({brl(best.value)})</span>}
        <span>{days.length}</span>
      </figcaption>
    </figure>
  );
}

/** Receitas x despesas por mês (duas séries com legenda) e linha de resultado. */
export function MonthlyChart({ months }: { months: { label: string; income: number; expense: number }[] }) {
  const W = 640, H = 220, PAD_L = 44, PAD_B = 26, PAD_T = 12;
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1);
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const innerW = W - PAD_L - 8, innerH = H - PAD_B - PAD_T;
  const slot = innerW / months.length;
  const bw = Math.min(16, slot / 3);
  const yv = (v: number) => PAD_T + innerH - (v / top) * innerH;
  const ticks = [0, top / 2, top];
  const profitPts = months.map((m, i) => `${PAD_L + slot * i + slot / 2},${yv(Math.max(m.income - m.expense, 0))}`).join(" ");

  return (
    <figure>
      <div className="flex gap-4 text-xs text-[#6B5A4B] mb-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: BRONZE }} /> Receitas</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: "#E3D3C4" }} /> Despesas</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5" style={{ background: GOLD }} /> Resultado</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Receitas e despesas por mês">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - 8} y1={yv(t)} y2={yv(t)} stroke="#F0E7DA" />
            <text x={PAD_L - 6} y={yv(t) + 4} textAnchor="end" fontSize="10" fill="#A69885">{compact.format(t)}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = PAD_L + slot * i + slot / 2;
          return (
            <g key={m.label}>
              <title>{`${m.label}: receitas ${brl(m.income)} · despesas ${brl(m.expense)} · resultado ${brl(m.income - m.expense)}`}</title>
              <rect x={cx - slot / 2} y={PAD_T} width={slot} height={innerH} fill="transparent" />
              <rect x={cx - bw - 1} y={yv(m.income)} width={bw} height={Math.max(innerH + PAD_T - yv(m.income), 0)} rx="3" fill={BRONZE} />
              <rect x={cx + 1} y={yv(m.expense)} width={bw} height={Math.max(innerH + PAD_T - yv(m.expense), 0)} rx="3" fill="#E3D3C4" />
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#857566">{m.label}</text>
            </g>
          );
        })}
        <polyline points={profitPts} fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
        {months.map((m, i) => (
          <circle key={m.label} cx={PAD_L + slot * i + slot / 2} cy={yv(Math.max(m.income - m.expense, 0))} r="3.5" fill="#fff" stroke={GOLD} strokeWidth="2" />
        ))}
      </svg>
    </figure>
  );
}

/** Mini gráfico de linha para tendências em cards. */
export function Sparkline({ values, color = BRONZE }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const W = 120, H = 32;
  const max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / (max - min || 1)) * (H - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[120px] h-8" aria-hidden="true">
      <polyline points={`0,${H} ${pts} ${W},${H}`} fill={`${color}22`} stroke="none" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
