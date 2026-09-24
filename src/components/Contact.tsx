"use client";

import { useState, useTransition } from "react";
import AnimateIn from "./AnimateIn";
import { MapPin, Phone, Mail, Clock, AtSign, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { sendContactMessage } from "@/app/actions/public";
import { maskPhone } from "@/lib/format";
import { instagramUrl, telHref, type SiteContent } from "@/lib/site-content";

export default function Contact({ content: c, hours }: { content: SiteContent["contact"]; hours: string }) {
  const contactInfo = [
    { icon: MapPin, label: "Endereço", value: c.address, link: c.maps_url || null },
    { icon: Phone, label: "Telefone", value: c.phone, link: telHref(c.phone) },
    { icon: Mail, label: "E-mail", value: c.email, link: `mailto:${c.email}` },
    { icon: Clock, label: "Horário de Atendimento", value: hours.split(" · ").join("\n"), link: null },
    { icon: AtSign, label: "Instagram", value: c.instagram, link: c.instagram ? instagramUrl(c.instagram) : null },
  ].filter((i) => i.value.trim());

  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await sendContactMessage(form);
      if (r.ok) setSent(true);
      else setError(r.message);
    });
  };

  return (
    <section id="contato" className="py-28 bg-[#FDFAF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <AnimateIn animation="fade">
            <span className="section-label">{c.eyebrow}</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light text-bronze-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {c.title}{" "}
              <em className="italic font-normal" style={{ color: "#9A6F1E" }}>
                {c.title_highlight}
              </em>
            </h2>
          </AnimateIn>
          <AnimateIn animation="scale" delay={200}>
            <div className="gold-line mx-auto" />
          </AnimateIn>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Info column */}
          <AnimateIn animation="left" delay={100} className="lg:col-span-2">
            <div>
              <p
                className="text-base font-light leading-8 text-text-secondary mb-8"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                {c.intro}
              </p>

              <div className="flex flex-col gap-6">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex gap-4 items-start">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "linear-gradient(135deg,#FBF7EE,#F6EEDB)",
                        border: "1px solid #EEDFBF",
                      }}
                    >
                      <item.icon size={16} className="text-bronze-500" />
                    </div>
                    <div>
                      <p
                        className="text-[10.5px] uppercase tracking-widest text-text-muted mb-1"
                        style={{ fontFamily: "var(--font-lato), sans-serif" }}
                      >
                        {item.label}
                      </p>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-light text-bronze-700 hover:text-bronze-500 transition-colors whitespace-pre-line"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p
                          className="text-sm font-light text-text-secondary whitespace-pre-line"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          {item.value}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Map placeholder */}
              {c.address && <div
                className="mt-8 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "linear-gradient(135deg,#F6EEDB,#FFF0C4)",
                  border: "1px solid #EEDFBF",
                }}
              >
                <div className="text-center">
                  <MapPin size={28} className="text-bronze-400 mx-auto mb-2" />
                  <p
                    className="text-sm font-light text-bronze-700 whitespace-pre-line"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    {c.address}
                  </p>
                  {c.maps_url && <a
                    href={c.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] tracking-widest uppercase hover:opacity-70 mt-1 block"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
                  >
                    Ver no Google Maps →
                  </a>}
                </div>
              </div>}
            </div>
          </AnimateIn>

          {/* Form column */}
          <AnimateIn animation="right" delay={200} className="lg:col-span-3">
            {sent ? (
              <div
                className="h-full flex flex-col items-center justify-center text-center py-16 rounded-2xl"
                style={{ background: "#FBF7EE", border: "1px solid #EEDFBF" }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg,#9A6F1E,#6B4A10)" }}
                >
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <h3
                  className="text-2xl font-light text-bronze-800 mb-3"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  Mensagem Enviada!
                </h3>
                <p
                  className="text-sm font-light text-text-secondary max-w-xs leading-7"
                  style={{ fontFamily: "var(--font-lato), sans-serif" }}
                >
                  {c.success_text}
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name:"", email:"", phone:"", message:"", website:"" }); }}
                  className="btn-outline mt-6"
                >
                  Nova Mensagem
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl p-8 sm:p-10"
                style={{
                  background: "white",
                  border: "1px solid #EEDFBF",
                  boxShadow: "0 4px 40px rgba(154,111,30,0.08)",
                }}
              >
                <div className="grid sm:grid-cols-2 gap-5 mb-5">
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
                      placeholder="Seu nome completo"
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
                      placeholder="(11) 99999-9999"
                      className="form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="mb-5">
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

                <div className="mb-8">
                  <label
                    className="block text-[11px] tracking-widest uppercase text-text-muted mb-2"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    Mensagem
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Como podemos ajudar? Dúvidas sobre tratamentos, preços ou agendamentos…"
                    className="form-input resize-none"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

                <input
                  type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                  className="hidden" value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                />

                {error && (
                  <p className="mb-5 flex items-start gap-2 rounded-lg px-4 py-3 text-sm" style={{ background: "#FFF1F1", color: "#9B2C2C", border: "1px solid #F4C2C2" }} role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center"
                  style={{ opacity: loading ? 0.8 : 1 }}
                >
                  {loading ? (
                    "Enviando…"
                  ) : (
                    <>
                      <Send size={14} /> Enviar Mensagem
                    </>
                  )}
                </button>
              </form>
            )}
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
