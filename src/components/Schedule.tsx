"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, CheckCircle2 } from "lucide-react";
import AnimateIn from "./AnimateIn";
import { services, timeSlots } from "@/lib/data";

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const DAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function Schedule() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
    setSelectedTime(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
    setSelectedTime(null);
  };

  const isToday = (d: number) =>
    d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  const isPast = (d: number) => {
    const date = new Date(currentYear, currentMonth, d);
    date.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    return date < t;
  };
  const isSunday = (d: number) => new Date(currentYear, currentMonth, d).getDay() === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section
      id="agendamento"
      className="py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFF5F7 0%, #FDFAF7 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-14">
          <AnimateIn animation="fade">
            <span className="section-label">Agende sua Visita</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Faça seu{" "}
              <em className="italic font-normal" style={{ color: "#C8737A" }}>
                Agendamento
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto" />
          </AnimateIn>
        </div>

        {submitted ? (
          <AnimateIn animation="scale">
            <div className="max-w-md mx-auto text-center py-16 px-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "linear-gradient(135deg,#C8737A,#8B3A42)" }}
              >
                <CheckCircle2 size={36} className="text-white" />
              </div>
              <h3
                className="text-3xl font-light text-rose-800 mb-3"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Agendamento Confirmado!
              </h3>
              <p
                className="text-sm font-light text-text-secondary leading-7 mb-8"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Recebemos sua solicitação. Em breve nossa equipe entrará em contato pelo WhatsApp para confirmar seu horário.
              </p>
              <button
                onClick={() => { setSubmitted(false); setStep(1); setSelectedDate(null); setSelectedTime(null); setSelectedService(""); setForm({ name:"", phone:"", email:"" }); }}
                className="btn-outline"
              >
                Novo Agendamento
              </button>
            </div>
          </AnimateIn>
        ) : (
          <AnimateIn animation="up" delay={200}>
            <div
              className="max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-[0_8px_60px_rgba(200,115,122,0.12)]"
              style={{ background: "white", border: "1px solid #F9C7CE" }}
            >
              {/* Steps indicator */}
              <div
                className="flex items-center justify-between px-8 py-5 border-b border-rose-50"
                style={{ background: "linear-gradient(135deg,#FFF5F7,#FFF8E7)" }}
              >
                {[
                  { n: 1, label: "Serviço & Data" },
                  { n: 2, label: "Horário" },
                  { n: 3, label: "Seus Dados" },
                ].map((s, i, arr) => (
                  <div key={s.n} className="flex items-center flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-light transition-all duration-300"
                        style={{
                          fontFamily: "var(--font-lato), sans-serif",
                          background: step >= s.n
                            ? "linear-gradient(135deg,#C8737A,#8B3A42)"
                            : "#F9C7CE",
                          color: step >= s.n ? "white" : "#9C7A80",
                        }}
                      >
                        {s.n}
                      </div>
                      <span
                        className="hidden sm:block text-[11px] tracking-wide uppercase"
                        style={{
                          fontFamily: "var(--font-lato), sans-serif",
                          color: step >= s.n ? "#C8737A" : "#9C7A80",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className="flex-1 h-px mx-4 transition-all duration-500"
                        style={{ background: step > s.n ? "#C8737A" : "#F9C7CE" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="p-6 sm:p-10">
                {step === 1 && (
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Service selector */}
                    <div>
                      <label
                        className="block text-[11px] tracking-widest uppercase text-text-muted mb-3"
                        style={{ fontFamily: "var(--font-lato), sans-serif" }}
                      >
                        Escolha o Serviço
                      </label>
                      <select
                        className="form-input"
                        value={selectedService}
                        onChange={(e) => setSelectedService(e.target.value)}
                      >
                        <option value="">Selecione um tratamento</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} — {s.price}
                          </option>
                        ))}
                      </select>

                      {selectedService && (
                        <div
                          className="mt-4 p-4 rounded-xl"
                          style={{ background: "#FFF5F7", border: "1px solid #F9C7CE" }}
                        >
                          {(() => {
                            const svc = services.find((s) => s.id === selectedService);
                            return svc ? (
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <span
                                    className="text-lg font-light text-rose-700"
                                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                                  >
                                    {svc.title}
                                  </span>
                                  <span
                                    className="text-rose-500 font-light"
                                    style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "18px" }}
                                  >
                                    {svc.price}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <Clock size={11} />
                                  <span className="text-[11px]" style={{ fontFamily: "var(--font-lato), sans-serif" }}>
                                    {svc.duration}
                                  </span>
                                </div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Calendar */}
                    <div>
                      <label
                        className="block text-[11px] tracking-widest uppercase text-text-muted mb-3"
                        style={{ fontFamily: "var(--font-lato), sans-serif" }}
                      >
                        Escolha a Data
                      </label>
                      <div
                        className="rounded-xl p-4"
                        style={{ border: "1px solid #F9C7CE", background: "#FDFAF7" }}
                      >
                        {/* Month nav */}
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={prevMonth} className="p-1.5 hover:text-rose-500 transition-colors">
                            <ChevronLeft size={16} className="text-text-muted" />
                          </button>
                          <span
                            className="text-sm font-light text-rose-800"
                            style={{ fontFamily: "var(--font-cormorant), serif", fontSize: "17px" }}
                          >
                            {MONTHS[currentMonth]} {currentYear}
                          </span>
                          <button onClick={nextMonth} className="p-1.5 hover:text-rose-500 transition-colors">
                            <ChevronRight size={16} className="text-text-muted" />
                          </button>
                        </div>

                        {/* Day headers */}
                        <div className="grid grid-cols-7 mb-2">
                          {DAYS_SHORT.map((d) => (
                            <div
                              key={d}
                              className="text-center text-[10px] tracking-wide py-1"
                              style={{
                                fontFamily: "var(--font-lato), sans-serif",
                                color: d === "Dom" ? "#C8737A" : "#9C7A80",
                              }}
                            >
                              {d}
                            </div>
                          ))}
                        </div>

                        {/* Days */}
                        <div className="grid grid-cols-7 gap-y-1">
                          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const past = isPast(d);
                            const sun = isSunday(d);
                            const disabled = past || sun;
                            const selected = selectedDate === d;
                            const todayDay = isToday(d);
                            return (
                              <button
                                key={d}
                                disabled={disabled}
                                onClick={() => setSelectedDate(d)}
                                className="w-8 h-8 mx-auto rounded-full text-[12px] transition-all duration-200 flex items-center justify-center"
                                style={{
                                  fontFamily: "var(--font-lato), sans-serif",
                                  background: selected
                                    ? "linear-gradient(135deg,#C8737A,#8B3A42)"
                                    : todayDay
                                    ? "#FFF5F7"
                                    : "transparent",
                                  color: selected
                                    ? "white"
                                    : disabled
                                    ? "#D4B8BC"
                                    : sun
                                    ? "#C8737A"
                                    : "#2C1A1E",
                                  border: todayDay && !selected ? "1px solid #C8737A" : "1px solid transparent",
                                  cursor: disabled ? "not-allowed" : "pointer",
                                }}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <p
                      className="text-sm font-light text-text-muted mb-6 flex items-center gap-2"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
                    >
                      <CalendarDays size={14} className="text-rose-400" />
                      {selectedDate && `${selectedDate} de ${MONTHS[currentMonth]} de ${currentYear}`}
                    </p>
                    <label
                      className="block text-[11px] tracking-widest uppercase text-text-muted mb-4"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
                    >
                      Escolha o Horário
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                      {timeSlots.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className="py-2.5 rounded-lg text-[12px] transition-all duration-200"
                          style={{
                            fontFamily: "var(--font-lato), sans-serif",
                            background: selectedTime === t
                              ? "linear-gradient(135deg,#C8737A,#8B3A42)"
                              : "#FFF5F7",
                            color: selectedTime === t ? "white" : "#6B4C52",
                            border: selectedTime === t ? "none" : "1px solid #F9C7CE",
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-5 mb-6">
                      <div>
                        <label
                          className="block text-[11px] tracking-widest uppercase text-text-muted mb-2"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Seu nome"
                          className="form-input"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label
                          className="block text-[11px] tracking-widest uppercase text-text-muted mb-2"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="(11) 99999-9999"
                          className="form-input"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label
                          className="block text-[11px] tracking-widest uppercase text-text-muted mb-2"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          E-mail
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="seu@email.com"
                          className="form-input"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Summary */}
                    <div
                      className="rounded-xl p-5 mb-6"
                      style={{ background: "#FFF5F7", border: "1px solid #F9C7CE" }}
                    >
                      <p className="section-label mb-3" style={{ fontSize: "9px" }}>Resumo do Agendamento</p>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: "Serviço", value: services.find(s=>s.id===selectedService)?.title || "—" },
                          { label: "Data", value: selectedDate ? `${selectedDate}/${currentMonth+1}/${currentYear}` : "—" },
                          { label: "Horário", value: selectedTime || "—" },
                        ].map(item => (
                          <div key={item.label}>
                            <p className="text-[10px] uppercase tracking-widest text-text-muted mb-0.5" style={{fontFamily:"var(--font-lato),sans-serif"}}>{item.label}</p>
                            <p className="text-rose-700 font-light" style={{fontFamily:"var(--font-cormorant),serif",fontSize:"17px"}}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary w-full justify-center">
                      Confirmar Agendamento
                    </button>
                  </form>
                )}

                {/* Navigation */}
                {!submitted && (
                  <div className="flex justify-between mt-8 pt-6 border-t border-rose-50">
                    <button
                      onClick={() => setStep(s => Math.max(1, s - 1) as any)}
                      className={`btn-outline text-sm ${step === 1 ? "opacity-0 pointer-events-none" : ""}`}
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    {step < 3 && (
                      <button
                        onClick={() => {
                          if (step === 1 && (!selectedService || !selectedDate)) return;
                          if (step === 2 && !selectedTime) return;
                          setStep(s => (s + 1) as any);
                        }}
                        className="btn-primary"
                        disabled={
                          (step === 1 && (!selectedService || !selectedDate)) ||
                          (step === 2 && !selectedTime)
                        }
                        style={{
                          opacity: (step === 1 && (!selectedService || !selectedDate)) || (step === 2 && !selectedTime) ? 0.5 : 1,
                        }}
                      >
                        Próximo <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
