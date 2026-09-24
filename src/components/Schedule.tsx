"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2, Loader2, MessageCircle, AlertCircle,
} from "lucide-react";
import AnimateIn from "./AnimateIn";
import { clinicInfo, services as staticServices } from "@/lib/data";
import { addDays, brl, fmtDate, fmtWeekday, maskPhone, todaySP, whatsappLink } from "@/lib/format";
import { candidateSlots, dayHours, DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { createBooking, getAvailability, type PublicConfig } from "@/app/actions/public";
import type { ServiceRow } from "@/lib/types";
import type { SiteContent } from "@/lib/site-content";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

type Slot = { time: string; available: boolean };
type Step = 1 | 2 | 3;

/** Serviços sem banco configurado: agendamento vira mensagem de WhatsApp. */
const FALLBACK: ServiceRow[] = staticServices.map((s, i) => ({
  id: s.id, name: s.title, category: s.category, description: s.description,
  duration_min: 60, price: 0, return_days: null, active: true, sort_order: i, show_on_home: true, icon: "sparkles",
}));

export default function Schedule({ config, content: c }: { config: PublicConfig | null; content: SiteContent["schedule"] }) {
  const online = config !== null && config.services.length > 0;
  const list = online ? config.services : FALLBACK;
  const hours = config?.hours ?? DEFAULT_HOURS;
  const clinicWhatsapp = config?.whatsapp ?? clinicInfo.whatsapp;

  const today = todaySP();
  const lastDay = addDays(today, config?.maxDaysAhead ?? 90);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);

  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", website: "" });

  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ serviceName: string; date: string; time: string; token?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const service = list.find((s) => s.id === serviceId);

  // Botões "Agendar" dos serviços e promoções já escolhem o serviço aqui.
  useEffect(() => {
    const onSelect = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!list.some((s) => s.id === id)) return;
      setServiceId(id); setTime(null); setStep(1); setDone(null); setError(null);
    };
    window.addEventListener("select-service", onSelect);
    return () => window.removeEventListener("select-service", onSelect);
  }, [list]);

  /** Busca os horários livres do dia e vai para o passo 2. */
  const loadSlots = (d: string, svc: ServiceRow) => {
    setStep(2);
    if (!online) {
      setSlots(candidateSlots(d, svc.duration_min, hours).map((t) => ({ time: t, available: true })));
      return;
    }
    setLoadingSlots(true);
    setSlots(null);
    getAvailability(d, svc.id)
      .then((r) => setSlots(r.ok ? r.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthKey = `${year}-${pad(month + 1)}`;
  const canGoPrev = monthKey > today.slice(0, 7);
  const canGoNext = monthKey < lastDay.slice(0, 7);

  const shiftMonth = (delta: number) => {
    const m = month + delta;
    setYear((y) => y + Math.floor(m / 12));
    setMonth(((m % 12) + 12) % 12);
  };

  const reset = () => {
    setDone(null); setStep(1); setDate(null); setTime(null); setServiceId(""); setSlots(null); setError(null);
    setForm({ name: "", phone: "", email: "", notes: "", website: "" });
  };

  const whatsText = (svc: string, d: string, t: string) =>
    `Olá! Sou ${form.name.trim()} e gostaria de agendar ${svc} em ${fmtDate(d)} às ${t}.`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !date || !time) return;
    setError(null);

    if (!online) {
      const link = whatsappLink(clinicWhatsapp, whatsText(service.name, date, time));
      if (link) window.open(link, "_blank", "noopener");
      setDone({ serviceName: service.name, date, time });
      return;
    }

    startTransition(async () => {
      const r = await createBooking({ serviceId: service.id, date, time, ...form });
      if (r.ok) {
        setDone({ serviceName: r.serviceName, date: r.date, time: r.time, token: r.token });
      } else {
        setError(r.message);
        if (r.slotTaken) { setTime(null); loadSlots(date, service); }
      }
    });
  };

  const canAdvance = (step === 1 && service && date) || (step === 2 && time);

  return (
    <section
      id="agendamento"
      className="py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FBF7EE 0%, #FDFAF7 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col items-center text-center mb-14">
          <AnimateIn animation="fade">
            <span className="section-label">{c.eyebrow}</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2 className="text-4xl sm:text-5xl font-light text-bronze-900 mt-4 mb-5">
              {c.title}{" "}
              <em className="italic font-normal" style={{ color: "#9A6F1E" }}>{c.title_highlight}</em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto" />
          </AnimateIn>
        </div>

        {done ? (
          <div className="max-w-md mx-auto text-center py-16 px-8" role="status">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: "linear-gradient(135deg,#9A6F1E,#6B4A10)" }}
            >
              <CheckCircle2 size={36} className="text-white" />
            </div>
            <h3 className="text-3xl font-light text-bronze-800 mb-3">
              {online ? "Pedido Recebido!" : "Quase lá!"}
            </h3>
            <p className="text-sm font-light text-text-secondary leading-7 mb-2">
              <strong className="font-normal text-bronze-700">{done.serviceName}</strong>
              <br />
              {fmtWeekday(done.date, "long")}, {fmtDate(done.date)} às {done.time}
            </p>
            <p className="text-sm font-light text-text-secondary leading-7 mb-8">
              {online
                ? "Seu horário está reservado. Vamos confirmar pelo WhatsApp em breve. Guarde o link “Ver meu agendamento” para consultar, salvar na agenda do celular ou cancelar."
                : "Finalize o envio da mensagem no WhatsApp para confirmarmos seu horário."}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
              <a
                href={whatsappLink(clinicWhatsapp, whatsText(done.serviceName, done.date, done.time)) ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary justify-center"
              >
                <MessageCircle size={14} /> Falar no WhatsApp
              </a>
              {done.token && (
                <a href={`/meu-agendamento/${done.token}`} className="btn-outline justify-center">
                  <CalendarDays size={14} /> Ver meu agendamento
                </a>
              )}
              <button onClick={reset} className="btn-outline justify-center">Novo Agendamento</button>
            </div>
          </div>
        ) : (
          <AnimateIn animation="up" delay={200}>
            <div
              className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(154,111,30,0.12)]"
              style={{ background: "white", border: "1px solid #EEDFBF" }}
            >
              {/* Passos */}
              <ol
                className="flex items-center justify-between px-5 sm:px-8 py-5 border-b border-bronze-50"
                style={{ background: "linear-gradient(135deg,#FBF7EE,#FFF8E7)" }}
              >
                {[
                  { n: 1, label: "Serviço & Data" },
                  { n: 2, label: "Horário" },
                  { n: 3, label: "Seus Dados" },
                ].map((s, i, arr) => (
                  <li key={s.n} className="flex items-center flex-1 last:flex-none" aria-current={step === s.n ? "step" : undefined}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300"
                        style={{
                          background: step >= s.n ? "linear-gradient(135deg,#9A6F1E,#6B4A10)" : "#EEDFBF",
                          color: step >= s.n ? "white" : "#6B5A4B",
                        }}
                      >
                        {s.n}
                      </div>
                      <span
                        className="hidden sm:block text-[11px] tracking-wide uppercase"
                        style={{ color: step >= s.n ? "#82590F" : "#8F8070" }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className="flex-1 h-px mx-4 transition-all duration-500"
                        style={{ background: step > s.n ? "#9A6F1E" : "#EEDFBF" }}
                      />
                    )}
                  </li>
                ))}
              </ol>

              <div className="p-6 sm:p-10">
                {error && (
                  <p className="mb-6 flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: "#FFF1F1", color: "#9B2C2C", border: "1px solid #F4C2C2" }} role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                  </p>
                )}

                {step === 1 && (
                  <div className="grid md:grid-cols-2 gap-8">
                    <fieldset>
                      <legend className="block text-[11px] tracking-widest uppercase text-text-muted mb-3">
                        Escolha o Serviço
                      </legend>
                      <div className="flex flex-col gap-2.5">
                        {list.map((s) => {
                          const selected = s.id === serviceId;
                          return (
                            <label
                              key={s.id}
                              className="flex items-start gap-3 rounded-xl p-4 cursor-pointer transition-all"
                              style={{
                                border: `1px solid ${selected ? "#9A6F1E" : "#EEDFBF"}`,
                                background: selected ? "#FBF7EE" : "white",
                                boxShadow: selected ? "0 0 0 3px rgba(154,111,30,.12)" : "none",
                              }}
                            >
                              <input
                                type="radio"
                                name="service"
                                value={s.id}
                                checked={selected}
                                onChange={() => { setServiceId(s.id); setTime(null); }}
                                className="mt-1 accent-[#9A6F1E]"
                              />
                              <span className="flex-1">
                                <span className="flex items-baseline justify-between gap-3">
                                  <span className="text-lg text-bronze-800" style={{ fontFamily: "var(--font-cormorant), serif" }}>
                                    {s.name}
                                  </span>
                                  {s.price > 0 && (
                                    <span className="text-sm whitespace-nowrap" style={{ color: "#A87B25" }}>{brl(s.price)}</span>
                                  )}
                                </span>
                                {online && (
                                  <span className="flex items-center gap-1 text-[11px] text-text-muted mt-0.5">
                                    <Clock size={11} /> {s.duration_min} min
                                  </span>
                                )}
                                {selected && s.description && (
                                  <span className="block text-[12px] font-light leading-5 mt-2 text-text-secondary">{s.description}</span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div>
                      <p className="block text-[11px] tracking-widest uppercase text-text-muted mb-3">Escolha a Data</p>
                      <div className="rounded-xl p-4" style={{ border: "1px solid #EEDFBF", background: "#FDFAF7" }}>
                        <div className="flex items-center justify-between mb-4">
                          <button
                            type="button"
                            onClick={() => shiftMonth(-1)}
                            disabled={!canGoPrev}
                            aria-label="Mês anterior"
                            className="p-1.5 rounded-full hover:bg-bronze-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronLeft size={16} className="text-text-secondary" />
                          </button>
                          <span className="text-bronze-800" style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "18px" }} aria-live="polite">
                            {MONTHS[month]} {year}
                          </span>
                          <button
                            type="button"
                            onClick={() => shiftMonth(1)}
                            disabled={!canGoNext}
                            aria-label="Próximo mês"
                            className="p-1.5 rounded-full hover:bg-bronze-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <ChevronRight size={16} className="text-text-secondary" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 mb-2">
                          {DAYS_SHORT.map((d) => (
                            <div key={d} className="text-center text-[10px] tracking-wide py-1 text-text-muted">{d}</div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 gap-y-1">
                          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const day = iso(year, month, d);
                            const disabled = day < today || day > lastDay || dayHours(day, hours) === null;
                            const selected = date === day;
                            const isToday = day === today;
                            return (
                              <button
                                key={d}
                                type="button"
                                disabled={disabled}
                                onClick={() => { setDate(day); setTime(null); }}
                                aria-pressed={selected}
                                aria-label={`${d} de ${MONTHS[month]}${disabled ? " (indisponível)" : ""}`}
                                className="w-9 h-9 mx-auto rounded-full text-[13px] transition-all duration-200 flex items-center justify-center enabled:hover:bg-bronze-100"
                                style={{
                                  background: selected ? "linear-gradient(135deg,#9A6F1E,#6B4A10)" : isToday ? "#FBF7EE" : "transparent",
                                  color: selected ? "white" : disabled ? "#D9CDB8" : "#2B221B",
                                  border: isToday && !selected ? "1px solid #9A6F1E" : "1px solid transparent",
                                  cursor: disabled ? "not-allowed" : "pointer",
                                  textDecoration: disabled && day >= today ? "line-through" : "none",
                                }}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-text-muted mt-3 text-center">
                          {hoursSummary(hours)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && date && service && (
                  <div>
                    <p className="text-sm font-light text-text-secondary mb-6 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-bronze-400" />
                        {fmtWeekday(date, "long")}, {fmtDate(date)}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock size={14} className="text-bronze-400" /> {service.name} · {service.duration_min} min
                      </span>
                    </p>
                    <p className="block text-[11px] tracking-widest uppercase text-text-muted mb-4">Escolha o Horário</p>

                    {loadingSlots || !slots ? (
                      <p className="flex items-center gap-2 text-sm text-text-muted py-6">
                        <Loader2 size={16} className="animate-spin" /> Buscando horários livres…
                      </p>
                    ) : slots.every((s) => !s.available) ? (
                      <div className="rounded-xl p-6 text-center" style={{ background: "#FBF7EE", border: "1px solid #EEDFBF" }}>
                        <p className="text-sm text-text-secondary mb-3">Não há horários livres nesse dia para este serviço.</p>
                        <button type="button" className="btn-outline" onClick={() => setStep(1)}>Escolher outra data</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                        {slots.map((s) => {
                          const selected = time === s.time;
                          return (
                            <button
                              key={s.time}
                              type="button"
                              disabled={!s.available}
                              onClick={() => setTime(s.time)}
                              aria-pressed={selected}
                              className="py-2.5 rounded-lg text-[13px] transition-all duration-200 disabled:cursor-not-allowed enabled:hover:border-bronze-400"
                              style={{
                                background: selected ? "linear-gradient(135deg,#9A6F1E,#6B4A10)" : s.available ? "#FBF7EE" : "#F7F2EC",
                                color: selected ? "white" : s.available ? "#6B5A4B" : "#D0C6B4",
                                border: selected ? "1px solid transparent" : "1px solid #EEDFBF",
                                textDecoration: s.available ? "none" : "line-through",
                              }}
                            >
                              {s.time}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <form id="booking-form" onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-5 mb-6">
                      <div>
                        <label htmlFor="bk-name" className="block text-[11px] tracking-widest uppercase text-text-muted mb-2">Nome Completo</label>
                        <input
                          id="bk-name" type="text" required minLength={3} autoComplete="name" placeholder="Seu nome"
                          className="form-input" value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="bk-phone" className="block text-[11px] tracking-widest uppercase text-text-muted mb-2">WhatsApp</label>
                        <input
                          id="bk-phone" type="tel" required inputMode="numeric" autoComplete="tel-national"
                          placeholder="(11) 99999-9999" pattern="\(\d{2}\) \d{4,5}-\d{4}"
                          title="Informe o número com DDD"
                          className="form-input" value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="bk-email" className="block text-[11px] tracking-widest uppercase text-text-muted mb-2">
                          E-mail <span className="normal-case tracking-normal">(opcional)</span>
                        </label>
                        <input
                          id="bk-email" type="email" autoComplete="email" placeholder="seu@email.com"
                          className="form-input" value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="bk-notes" className="block text-[11px] tracking-widest uppercase text-text-muted mb-2">
                          Observações <span className="normal-case tracking-normal">(opcional)</span>
                        </label>
                        <textarea
                          id="bk-notes" rows={2} maxLength={500} placeholder="Alergias, preferências ou dúvidas"
                          className="form-input resize-none" value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        />
                      </div>
                      {/* Campo-armadilha contra robôs */}
                      <input
                        type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                        className="hidden" value={form.website}
                        onChange={(e) => setForm({ ...form, website: e.target.value })}
                      />
                    </div>

                    <div className="rounded-xl p-5 mb-6" style={{ background: "#FBF7EE", border: "1px solid #EEDFBF" }}>
                      <p className="section-label mb-3" style={{ fontSize: "9px" }}>Resumo do Agendamento</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Serviço", value: service?.name ?? "—" },
                          { label: "Data", value: date ? fmtDate(date) : "—" },
                          { label: "Horário", value: time ?? "—" },
                          { label: "Valor", value: service && service.price > 0 ? brl(service.price) : "A combinar" },
                        ].map((item) => (
                          <div key={item.label}>
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5">{item.label}</p>
                            <p className="text-bronze-700" style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "17px" }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={pending} className="btn-primary w-full justify-center disabled:opacity-70">
                      {pending ? <><Loader2 size={14} className="animate-spin" /> Enviando…</> : online ? "Confirmar Agendamento" : "Enviar pelo WhatsApp"}
                    </button>
                  </form>
                )}

                <div className="flex justify-between mt-8 pt-6 border-t border-bronze-50">
                  <button
                    type="button"
                    onClick={() => { setError(null); setStep((s) => Math.max(1, s - 1) as Step); }}
                    className={`btn-outline ${step === 1 ? "invisible" : ""}`}
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>
                  {step < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canAdvance) return;
                        setError(null);
                        if (step === 1 && date && service) loadSlots(date, service);
                        else setStep(3);
                      }}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canAdvance}
                    >
                      Próximo <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
