"use client";

import { useState } from "react";
import AnimateIn from "./AnimateIn";
import { MapPin, Phone, Mail, Clock, AtSign, Send, CheckCircle2 } from "lucide-react";

const contactInfo = [
  {
    icon: MapPin,
    label: "Endereço",
    value: "Av. Paulista, 1337 - Bela Vista\nSão Paulo — SP",
    link: "https://maps.google.com/?q=Av.+Paulista+1337+Bela+Vista+São+Paulo",
  },
  {
    icon: Phone,
    label: "Telefone",
    value: "(11) 6578-2211",
    link: "tel:+551165782211",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "contato@talissaestetica.com.br",
    link: "mailto:contato@talissaestetica.com.br",
  },
  {
    icon: Clock,
    label: "Horário de Atendimento",
    value: "Seg–Sex: 9h às 20h\nSáb: 9h às 16h\nDom: Fechado",
    link: null,
  },
  {
    icon: AtSign,
    label: "Instagram",
    value: "@talissaesteticaebemestar",
    link: "https://instagram.com/talissaesteticaebemestar",
  },
];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  };

  return (
    <section id="contato" className="py-28 bg-[#FDFAF7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <AnimateIn animation="fade">
            <span className="section-label">Fale Conosco</span>
          </AnimateIn>
          <AnimateIn animation="up" delay={100}>
            <h2
              className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              Entre em{" "}
              <em className="italic font-normal" style={{ color: "#C8737A" }}>
                Contato
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
                Estamos prontas para atender você com todo o cuidado e atenção
                que você merece. Entre em contato pelos canais abaixo ou envie
                uma mensagem.
              </p>

              <div className="flex flex-col gap-6">
                {contactInfo.map((item) => (
                  <div key={item.label} className="flex gap-4 items-start">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: "linear-gradient(135deg,#FFF5F7,#FFE8ED)",
                        border: "1px solid #F9C7CE",
                      }}
                    >
                      <item.icon size={16} className="text-rose-500" />
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
                          className="text-sm font-light text-rose-700 hover:text-rose-500 transition-colors"
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
              <div
                className="mt-8 h-48 rounded-2xl flex items-center justify-center overflow-hidden"
                style={{
                  background: "linear-gradient(135deg,#FFE8ED,#FFF0C4)",
                  border: "1px solid #F9C7CE",
                }}
              >
                <div className="text-center">
                  <MapPin size={28} className="text-rose-400 mx-auto mb-2" />
                  <p
                    className="text-sm font-light text-rose-700"
                    style={{ fontFamily: "var(--font-cormorant), serif" }}
                  >
                    Av. Paulista, 1337<br />Bela Vista — São Paulo, SP
                  </p>
                  <a
                    href="https://maps.google.com/?q=Av.+Paulista+1337+Bela+Vista+São+Paulo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] tracking-widest uppercase hover:opacity-70 mt-1 block"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: "#C9973A" }}
                  >
                    Ver no Google Maps →
                  </a>
                </div>
              </div>
            </div>
          </AnimateIn>

          {/* Form column */}
          <AnimateIn animation="right" delay={200} className="lg:col-span-3">
            {sent ? (
              <div
                className="h-full flex flex-col items-center justify-center text-center py-16 rounded-2xl"
                style={{ background: "#FFF5F7", border: "1px solid #F9C7CE" }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg,#C8737A,#8B3A42)" }}
                >
                  <CheckCircle2 size={28} className="text-white" />
                </div>
                <h3
                  className="text-2xl font-light text-rose-800 mb-3"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  Mensagem Enviada!
                </h3>
                <p
                  className="text-sm font-light text-text-secondary max-w-xs leading-7"
                  style={{ fontFamily: "var(--font-lato), sans-serif" }}
                >
                  Obrigada pelo seu contato. Retornaremos em até 24 horas.
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name:"", email:"", phone:"", message:"" }); }}
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
                  border: "1px solid #F9C7CE",
                  boxShadow: "0 4px 40px rgba(200,115,122,0.08)",
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
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
                    placeholder="Como podemos ajudá-la? Dúvidas sobre tratamentos, preços ou agendamentos…"
                    className="form-input resize-none"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>

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
