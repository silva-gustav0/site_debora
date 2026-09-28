"use client";

import { startTransition, useActionState, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, History, NotebookPen, Pause, Play, Plus, X } from "lucide-react";
import AttendanceScene, { AttendanceAmbient } from "./AttendanceScene";
import { completeAppointment } from "@/app/painel/actions";
import { firstName, fmtDate, METHOD_LABEL } from "@/lib/format";
import type { AttendanceTheme } from "@/lib/attendance-themes";

type Clock = { startedAt: number; pausedAt: number | null; pausedTotal: number; extraMin: number; alerted: boolean };
type Notes = { chips: Record<string, string[]>; text: string };

// ─── Estado guardado no aparelho (sobrevive a sair da tela ou fechar o app) ──
const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();
function readStore(key: string) {
  if (!memory.has(key)) {
    let v: string | null = null;
    try { v = localStorage.getItem(key); } catch {}
    memory.set(key, v);
  }
  return memory.get(key) ?? null;
}
function writeStore(key: string, value: unknown) {
  const raw = value === null ? null : JSON.stringify(value);
  memory.set(key, raw);
  try { if (raw === null) localStorage.removeItem(key); else localStorage.setItem(key, raw); } catch {}
  listeners.forEach((l) => l());
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
function useStored<T>(key: string): [T | null, (v: T | null) => void] {
  const raw = useSyncExternalStore(subscribe, () => readStore(key), () => null);
  const value = useMemo(() => (raw ? (JSON.parse(raw) as T) : null), [raw]);
  const set = useCallback((v: T | null) => writeStore(key, v), [key]);
  return [value, set];
}

const pad = (n: number) => String(n).padStart(2, "0");
function fmtClock(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Três notas suaves (sem arquivo de áudio). */
function chime(ctx: AudioContext | null) {
  if (!ctx) return;
  [659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.28;
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.5);
  });
}

type Props = {
  appointment: { id: string; status: string; price: number; fromPackage: boolean; notes: string | null };
  client: { id: string; name: string; skin_type: string | null; allergies: string | null; health_notes: string | null } | null;
  serviceName: string;
  minutes: number;
  theme: AttendanceTheme;
  lastSession: { record_date: string; procedure: string; observations: string | null; next_steps: string | null } | null;
  fees: { credit: number; debit: number };
};

/** Tela do atendimento em andamento: cronômetro, cena animada do procedimento e anotações rápidas. */
export default function AttendanceScreen({ appointment, client, serviceName, minutes, theme, lastSession, fees }: Props) {
  const id = appointment.id;
  const clockKey = `atendimento:${id}`;
  const [clock, setClock] = useStored<Clock>(clockKey);
  const [notes, setNotes] = useStored<Notes>(`atendimento-notas:${id}`);
  const [now, setNow] = useState(0);
  const [tab, setTab] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const open = appointment.status === "solicitado" || appointment.status === "confirmado";

  // Começa sozinho ao abrir a tela (lê o aparelho direto, pois a 1ª renderização ainda não o conhece).
  useEffect(() => {
    if (open && !readStore(clockKey)) writeStore(clockKey, { startedAt: Date.now(), pausedAt: null, pausedTotal: 0, extraMin: 0, alerted: false } satisfies Clock);
  }, [clockKey, open]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0), every = setInterval(tick, 500);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  // Tela do tablet não apaga durante o atendimento.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => { try { lock = await navigator.wakeLock?.request("screen"); } catch {} };
    const onVisible = () => { if (!document.hidden) request(); };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); lock?.release().catch(() => {}); };
  }, []);

  // O som só pode tocar depois de um toque na tela.
  useEffect(() => {
    const unlock = () => {
      audio.current ??= new AudioContext();
      audio.current.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const total = (minutes + (clock?.extraMin ?? 0)) * 60_000;
  const elapsed = clock && now ? Math.max(0, (clock.pausedAt ?? now) - clock.startedAt - clock.pausedTotal) : 0;
  const remaining = total - elapsed;
  const overtime = Boolean(clock) && now > 0 && remaining <= 0;
  const progress = Math.min(1, elapsed / total);
  const paused = Boolean(clock?.pausedAt);

  useEffect(() => {
    if (!overtime || !clock || clock.alerted) return;
    chime(audio.current);
    navigator.vibrate?.([220, 120, 220]);
    setClock({ ...clock, alerted: true });
  }, [overtime, clock, setClock]);

  const togglePause = () => {
    if (!clock) return;
    const t = Date.now();
    setClock(clock.pausedAt ? { ...clock, pausedAt: null, pausedTotal: clock.pausedTotal + (t - clock.pausedAt) } : { ...clock, pausedAt: t });
  };
  const addFive = () => clock && setClock({ ...clock, extraMin: clock.extraMin + 5, alerted: false });

  const current: Notes = notes ?? { chips: {}, text: "" };
  const toggleChip = (group: string, chip: string) => {
    const list = current.chips[group] ?? [];
    setNotes({ ...current, chips: { ...current.chips, [group]: list.includes(chip) ? list.filter((c) => c !== chip) : [...list, chip] } });
  };
  const picked = (field: string) => theme.groups.filter((g) => g.field === field && current.chips[g.title]?.length);

  const record = {
    observations: [
      ...picked("observations").map((g) => `${g.title}: ${current.chips[g.title].join(", ")}`),
      current.text.trim(),
    ].filter(Boolean).join("\n"),
    products: picked("products_used").flatMap((g) => current.chips[g.title]).join(", "),
    next: picked("next_steps").flatMap((g) => current.chips[g.title]).join("; "),
    parameters: `Duração real: ${Math.max(1, Math.round(elapsed / 60_000))} min (previsto ${minutes} min)`,
  };
  const noteCount = Object.values(current.chips).reduce((n, l) => n + l.length, 0) + (current.text.trim() ? 1 : 0);

  const R = 47, C = 2 * Math.PI * R;
  const alerts = [
    client?.allergies && `Alergias: ${client.allergies}`,
    client?.health_notes && `Saúde: ${client.health_notes}`,
    client?.skin_type && `Pele: ${client.skin_type}`,
    appointment.notes && `Pedido: “${appointment.notes}”`,
  ].filter(Boolean) as string[];

  return (
    <div
      className="att-root fixed inset-0 grid grid-rows-[minmax(0,1fr)_minmax(0,42%)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,32%)] text-white overflow-hidden"
      style={{ background: `radial-gradient(120% 90% at 30% 20%, ${theme.to} 0%, ${theme.from} 70%)`, ["--glow" as string]: theme.glow }}
    >
      {/* Palco: cena animada + cronômetro */}
      <section className="relative flex flex-col min-h-0">
        <AttendanceAmbient kind={theme.scene} />
        <header className="relative z-10 flex items-center gap-3 px-4 sm:px-6 pt-4">
          <Link href={`/painel/agenda?a=${id}`} className="nav-link flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-white/75 bg-white/5 border border-white/10">
            <ArrowLeft size={15} /> Agenda
          </Link>
          <div className="min-w-0 flex-1 text-center pr-16">
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: theme.glow }}>{serviceName}</p>
            <p className="p-display text-2xl leading-tight truncate">{client ? client.name : "Cliente"}</p>
          </div>
        </header>

        <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-3 px-4 pb-4">
          <div className="relative" style={{ width: "min(50vmin, 420px)", height: "min(50vmin, 420px)" }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.6" />
              <circle
                cx="50" cy="50" r={R} fill="none" stroke={theme.glow} strokeWidth="1.8" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: "stroke-dashoffset .5s linear" }}
              />
            </svg>
            <div className={`absolute inset-[15%] ${paused ? "opacity-40" : ""} transition-opacity`}>
              <div className={paused ? "[&_*]:[animation-play-state:paused]" : ""} style={{ width: "100%", height: "100%" }}>
                <AttendanceScene kind={theme.scene} />
              </div>
            </div>
          </div>

          <div className="text-center" aria-live="polite">
            <p className={`p-display font-light tabular-nums leading-none ${overtime ? "att-overtime" : ""}`} style={{ fontSize: "clamp(56px, 10vmin, 104px)", color: overtime ? theme.glow : "#fff" }}>
              {!clock || !now ? fmtClock(minutes * 60_000) : overtime ? `+${fmtClock(remaining)}` : fmtClock(remaining)}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.24em] uppercase text-white/55">
              {!open ? "Atendimento já encerrado" : paused ? "Pausado" : overtime ? "Tempo previsto concluído" : `restantes · ${theme.mood}`}
            </p>
          </div>

          {open && (
            <div className="flex items-center gap-3 mt-1">
              <button onClick={togglePause} className="nav-link w-16 h-16 rounded-full flex items-center justify-center bg-white/8 border border-white/15" aria-label={paused ? "Retomar" : "Pausar"}>
                {paused ? <Play size={24} /> : <Pause size={24} />}
              </button>
              <button onClick={addFive} className="nav-link h-16 px-5 rounded-full flex items-center gap-1.5 bg-white/8 border border-white/15 text-[15px]">
                <Plus size={17} /> 5 min
              </button>
              <button
                onClick={() => setFinishing(true)}
                className="nav-link h-16 px-6 rounded-full flex items-center gap-2 text-[15px] font-bold text-[#231B15]"
                style={{ background: `linear-gradient(135deg, #fff, ${theme.glow})` }}
              >
                <CheckCircle2 size={19} /> Finalizar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Anotações */}
      <aside className="relative z-10 min-h-0 flex flex-col bg-[#FBF7F0] text-[#2B221B] rounded-t-3xl lg:rounded-none lg:rounded-l-3xl shadow-[0_-10px_40px_rgba(0,0,0,.25)]">
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <NotebookPen size={17} className="text-[#9A6F1E]" />
          <h2 className="p-display text-2xl flex-1">Observações</h2>
          {noteCount > 0 && <span className="text-[11px] rounded-full px-2 py-0.5 bg-[#2B221B] text-[#F3DDA6]">{noteCount}</span>}
        </div>

        {(alerts.length > 0 || lastSession) && (
          <div className="mx-5 mb-2 flex flex-col gap-1.5 text-[12.5px]">
            {alerts.length > 0 && (
              <p className="flex gap-2 rounded-xl px-3 py-2 bg-[#FFF3DC] text-[#6A4A10]">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{alerts.join(" · ")}</span>
              </p>
            )}
            {lastSession && (
              <p className="flex gap-2 rounded-xl px-3 py-2 bg-white border border-[#EEE5D8] text-[#6B5A4B]">
                <History size={14} className="flex-shrink-0 mt-0.5 text-[#9A6F1E]" />
                <span className="line-clamp-2">Última sessão ({fmtDate(lastSession.record_date, { year: undefined })}, {lastSession.procedure}): {lastSession.observations || lastSession.next_steps || "sem anotações"}</span>
              </p>
            )}
          </div>
        )}

        <div role="tablist" className="flex gap-1.5 px-5 overflow-x-auto pb-2 flex-shrink-0">
          {theme.groups.map((g, i) => {
            const n = current.chips[g.title]?.length ?? 0;
            return (
              <button
                key={g.title} role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                className={`att-chip whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] border ${tab === i ? "bg-[#2B221B] text-white border-[#2B221B]" : "bg-white text-[#6B5A4B] border-[#E8DCC8]"}`}
              >
                {g.title}{n > 0 && <span className="ml-1.5 text-[11px]" style={{ color: tab === i ? "#F3DDA6" : "#9A6F1E" }}>{n}</span>}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="flex-1 min-h-0 overflow-y-auto px-5 py-2">
          <div key={tab} className="flex flex-wrap gap-2 fade-in">
            {theme.groups[tab].chips.map((chip) => {
              const on = current.chips[theme.groups[tab].title]?.includes(chip);
              return (
                <button
                  key={chip} onClick={() => toggleChip(theme.groups[tab].title, chip)} aria-pressed={on}
                  className={`att-chip min-h-10 rounded-xl px-3.5 py-2 text-[14px] border flex items-center gap-1.5 ${on ? "bg-[#9A6F1E] text-white border-[#9A6F1E]" : "bg-white text-[#3B2E24] border-[#E8DCC8]"}`}
                >
                  {on && <Check size={14} />} {chip}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pt-2 pb-4 flex-shrink-0">
          <textarea
            value={current.text}
            onChange={(e) => setNotes({ ...current, text: e.target.value })}
            rows={3}
            placeholder={`Anotações livres sobre ${client ? firstName(client.name) : "a cliente"}…`}
            className="p-input resize-none text-[15px]"
          />
        </div>
      </aside>

      {finishing && (
        <FinishSheet
          id={id} serviceName={serviceName} price={appointment.price} fromPackage={appointment.fromPackage} fees={fees}
          record={record}
          onClose={() => setFinishing(false)}
          onDone={() => { writeStore(clockKey, null); writeStore(`atendimento-notas:${id}`, null); }}
        />
      )}
    </div>
  );
}

function FinishSheet({ id, serviceName, price, fromPackage, fees, record, onClose, onDone }: {
  id: string; serviceName: string; price: number; fromPackage: boolean; fees: { credit: number; debit: number };
  record: { observations: string; products: string; next: string; parameters: string };
  onClose: () => void; onDone: () => void;
}) {
  const [state, action, pending] = useActionState(completeAppointment, null);
  const router = useRouter();
  const [pay, setPay] = useState(!fromPackage);

  useEffect(() => {
    if (!state?.ok) return;
    onDone();
    router.replace(`/painel/agenda?a=${id}`);
  }, [state, onDone, router, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 fade-in" onClick={onClose} />
      <form
        onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => action(fd)); }}
        className="att-sheet relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#FBF7F0] text-[#2B221B] p-6 flex flex-col gap-4"
      >
        <button type="button" onClick={onClose} aria-label="Voltar ao atendimento" className="absolute top-3 right-3 p-2 text-[#857566]"><X size={20} /></button>
        <div>
          <p className="p-label">Finalizar atendimento</p>
          <p className="p-display text-3xl">{serviceName}</p>
          <p className="text-sm text-[#857566]">{record.parameters}</p>
        </div>

        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="record_note" value={record.observations} />
        <input type="hidden" name="products_used" value={record.products} />
        <input type="hidden" name="next_steps" value={record.next} />
        <input type="hidden" name="parameters" value={record.parameters} />

        <div className="rounded-2xl bg-white border border-[#EEE5D8] p-4 text-sm flex flex-col gap-2">
          <p className="p-label !mb-0">Vai para o prontuário</p>
          {record.observations || record.products || record.next ? (
            <>
              {record.observations && <p className="whitespace-pre-line text-[#4A3C30]">{record.observations}</p>}
              {record.products && <p className="text-[#6B5A4B]"><strong>Produtos:</strong> {record.products}</p>}
              {record.next && <p className="text-[#6B5A4B]"><strong>Orientações:</strong> {record.next}</p>}
            </>
          ) : <p className="text-[#857566]">Só a duração. Volte e toque nas observações se quiser registrar mais.</p>}
        </div>

        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" name="register_payment" checked={pay} onChange={(e) => setPay(e.target.checked)} className="accent-[#82590F] w-5 h-5" />
          Registrar pagamento {fromPackage && <span className="text-xs text-[#857566]">(sessão de pacote já paga)</span>}
        </label>
        {pay && (
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="p-label">Valor recebido</span>
              <input name="amount" inputMode="decimal" defaultValue={String(price).replace(".", ",")} className="p-input p-num text-[16px]" />
            </label>
            <label>
              <span className="p-label">Forma</span>
              <select name="method" defaultValue="pix" className="p-input text-[16px]">
                {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <p className="col-span-2 text-[11px] text-[#857566]">Taxas da maquininha: crédito {fees.credit}% · débito {fees.debit}%.</p>
          </div>
        )}

        {state && !state.ok && !pending && <p role="alert" className="text-sm rounded-lg px-3 py-2 bg-[#FFF1F1] text-[#9B2C2C]">{state.message}</p>}
        <button disabled={pending} className="p-btn h-14 text-[15px]">
          <CheckCircle2 size={17} /> {pending ? "Concluindo…" : "Concluir e salvar no prontuário"}
        </button>
      </form>
    </div>
  );
}
