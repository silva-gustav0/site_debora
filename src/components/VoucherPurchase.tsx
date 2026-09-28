"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Gift, Loader2, ShieldCheck, Sparkles, User } from "lucide-react";
import { startVoucherPurchase, type VoucherOffer } from "@/app/actions/vouchers";
import { brl, digits, maskPhone } from "@/lib/format";

type Kind = "servico" | "valor";

const PRESETS = [100, 200, 300, 500];
const MESSAGE_MAX = 300;

const LABEL = "block text-[11px] tracking-widest uppercase text-text-muted mb-2";
const lato = { fontFamily: "var(--font-lato), sans-serif" } as const;
const cormorant = { fontFamily: "var(--font-cormorant), serif" } as const;

function StepTitle({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <span className="text-3xl font-light leading-none" style={{ ...cormorant, color: "#C9973A" }}>{n}</span>
      <div>
        <h2 className="text-2xl sm:text-[28px] font-light text-bronze-900 leading-tight" style={cormorant}>{title}</h2>
        {hint && <p className="text-[13px] font-light text-text-muted mt-1" style={lato}>{hint}</p>}
      </div>
    </div>
  );
}

/** Cartão selecionável (radio) no estilo da escolha de serviço do agendamento. */
function Choice({
  name, checked, onChange, children, className = "",
}: { name: string; checked: boolean; onChange: () => void; children: React.ReactNode; className?: string }) {
  return (
    <label
      className={`relative flex items-start gap-3 rounded-xl p-4 sm:p-5 cursor-pointer transition-all ${className}`}
      style={{
        border: `1px solid ${checked ? "#9A6F1E" : "#EEDFBF"}`,
        background: checked ? "#FBF7EE" : "white",
        boxShadow: checked ? "0 0 0 3px rgba(154,111,30,.12)" : "0 2px 14px rgba(154,111,30,0.04)",
      }}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
        style={{ border: `1.5px solid ${checked ? "#9A6F1E" : "#D9C7A2"}`, background: checked ? "#9A6F1E" : "white" }}
      >
        {checked && <Check size={12} className="text-white" strokeWidth={3} />}
      </span>
      <span className="flex-1 min-w-0">{children}</span>
    </label>
  );
}

export default function VoucherPurchase({
  offers, min, max, months,
}: { offers: VoucherOffer[]; min: number; max: number; months: number }) {
  const [kind, setKind] = useState<Kind>(offers.length ? "servico" : "valor");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [preset, setPreset] = useState<number | null>(PRESETS.find((p) => p >= min && p <= max) ?? null);
  const [custom, setCustom] = useState("");
  const [forSelf, setForSelf] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [pending, startTransition] = useTransition();

  const presets = PRESETS.filter((p) => p >= min && p <= max);
  const service = offers.find((o) => o.id === serviceId) ?? null;
  // "1.500,00" → 1500; "150.5" → 150.5
  const customValue = custom ? Number(custom.includes(",") ? custom.replace(/\./g, "").replace(",", ".") : custom) : NaN;
  const amount = kind === "servico" ? service?.price ?? 0 : custom ? customValue : preset ?? 0;
  const amountOk = kind === "servico" ? Boolean(service) : Number.isFinite(amount) && amount >= min && amount <= max;
  const customInvalid = kind === "valor" && custom !== "" && !amountOk;

  const what = kind === "servico" ? service?.name ?? "Escolha um serviço" : amountOk ? `Vale-presente de ${brl(amount)}` : "Escolha um valor";
  const forWhom = forSelf ? "Para você" : recipientName.trim() || "Quem vai receber";
  const busy = pending || redirecting;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!amountOk) {
      setError(kind === "servico" ? "Escolha o serviço que você quer presentear." : `Escolha um valor entre ${brl(min)} e ${brl(max)}.`);
      return;
    }
    if (!forSelf && recipientName.trim().length < 2) {
      setError("Informe o nome de quem vai receber o presente.");
      return;
    }
    if (digits(buyer.phone).length < 10) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    startTransition(async () => {
      const res = await startVoucherPurchase({
        kind,
        serviceId: kind === "servico" ? serviceId ?? undefined : undefined,
        amount: kind === "valor" ? amount : undefined,
        forSelf,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        recipientName: forSelf ? undefined : recipientName,
        message: forSelf ? undefined : message,
        website: buyer.website,
      });
      if (res.ok) {
        setRedirecting(true);
        window.location.href = res.checkoutUrl;
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-10 lg:gap-14 items-start" style={lato}>
      <div className="flex flex-col gap-14 min-w-0">
        {/* A — o que presentear */}
        <section>
          <StepTitle n="01" title="O que você quer presentear?" hint="Um cuidado específico ou um valor para usar como quiser." />

          {offers.length > 0 && (
            <div role="radiogroup" aria-label="Tipo de vale-presente" className="inline-flex p-1 rounded-full mb-7" style={{ background: "#F6EEDB" }}>
              {([["servico", "Um serviço"], ["valor", "Um valor"]] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => { setKind(k); setError(null); }}
                  className="px-5 sm:px-7 py-2.5 rounded-full text-[11.5px] tracking-[0.14em] uppercase transition-all"
                  style={kind === k
                    ? { background: "#2B221B", color: "#E8C882", boxShadow: "0 6px 18px -8px rgba(43,34,27,.6)" }
                    : { color: "#6B5A4B" }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {kind === "servico" ? (
            <fieldset>
              <legend className="sr-only">Escolha o serviço</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                {offers.map((o) => (
                  <Choice key={o.id} name="vp-service" checked={o.id === serviceId} onChange={() => { setServiceId(o.id); setError(null); }}>
                    <span className="block text-[19px] leading-snug text-bronze-800" style={cormorant}>{o.name}</span>
                    {o.description && (
                      <span className="block text-[12.5px] font-light leading-5 mt-1 text-text-secondary line-clamp-2">{o.description}</span>
                    )}
                    <span className="block text-[15px] mt-2.5" style={{ color: "#A87B25" }}>{brl(o.price)}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="sr-only">Escolha o valor</legend>
              <div className="flex flex-wrap gap-2.5">
                {presets.map((p) => {
                  const on = !custom && preset === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => { setPreset(p); setCustom(""); setError(null); }}
                      className="min-w-[96px] px-5 py-3 rounded-full text-[22px] font-light transition-all"
                      style={{
                        ...cormorant,
                        border: `1px solid ${on ? "#9A6F1E" : "#EEDFBF"}`,
                        background: on ? "#2B221B" : "white",
                        color: on ? "#E8C882" : "#6B4A10",
                      }}
                    >
                      R$ {p}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 max-w-xs">
                <label htmlFor="vp-custom" className={LABEL}>Ou digite outro valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">R$</span>
                  <input
                    id="vp-custom" type="text" inputMode="decimal" autoComplete="off" placeholder={`${min} a ${max.toLocaleString("pt-BR")}`}
                    className="form-input" style={{ paddingLeft: 42 }}
                    value={custom}
                    aria-invalid={customInvalid}
                    aria-describedby="vp-custom-hint"
                    onChange={(e) => { setCustom(e.target.value.replace(/[^\d.,]/g, "").slice(0, 9)); setError(null); }}
                  />
                </div>
                <p id="vp-custom-hint" className="text-[11.5px] mt-1.5" style={{ color: customInvalid ? "#9B2C2C" : "#8F8070" }}>
                  Entre {brl(min)} e {brl(max)}. O saldo pode ser usado em qualquer serviço.
                </p>
              </div>
            </fieldset>
          )}
        </section>

        {/* B — para quem */}
        <section>
          <StepTitle n="02" title="Para quem é?" />
          <fieldset>
            <legend className="sr-only">Para quem é o vale-presente</legend>
            <div className="grid grid-cols-2 gap-3">
              <Choice name="vp-for" checked={!forSelf} onChange={() => setForSelf(false)}>
                <span className="flex items-center gap-2 text-[18px] text-bronze-800" style={cormorant}>
                  <Gift size={16} className="text-bronze-500 flex-shrink-0" /> Para presentear
                </span>
                <span className="hidden sm:block text-[12px] font-light text-text-muted mt-1">Com nome e mensagem no cartão.</span>
              </Choice>
              <Choice name="vp-for" checked={forSelf} onChange={() => setForSelf(true)}>
                <span className="flex items-center gap-2 text-[18px] text-bronze-800" style={cormorant}>
                  <User size={16} className="text-bronze-500 flex-shrink-0" /> Para mim
                </span>
                <span className="hidden sm:block text-[12px] font-light text-text-muted mt-1">Um mimo só seu.</span>
              </Choice>
            </div>
          </fieldset>

          {!forSelf && (
            <div className="grid gap-5 mt-6">
              <div>
                <label htmlFor="vp-recipient" className={LABEL}>Nome de quem vai receber</label>
                <input
                  id="vp-recipient" type="text" required minLength={2} maxLength={120} autoComplete="off" placeholder="Como vai aparecer no cartão"
                  className="form-input" value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label htmlFor="vp-message" className={LABEL}>
                    Mensagem <span className="normal-case tracking-normal">(opcional)</span>
                  </label>
                  <span className="text-[11px] tabular-nums" style={{ color: message.length >= MESSAGE_MAX ? "#9A6F1E" : "#8F8070" }} aria-live="polite">
                    {message.length}/{MESSAGE_MAX}
                  </span>
                </div>
                <textarea
                  id="vp-message" rows={3} maxLength={MESSAGE_MAX} placeholder="Escreva algo especial para acompanhar o presente"
                  className="form-input resize-none" value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                />
              </div>
            </div>
          )}
        </section>

        {/* C — seus dados */}
        <section>
          <StepTitle n="03" title="Seus dados" hint="Para enviarmos o comprovante e falarmos com você se precisar." />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label htmlFor="vp-name" className={LABEL}>Nome completo</label>
              <input
                id="vp-name" type="text" required minLength={3} maxLength={120} autoComplete="name" placeholder="Seu nome"
                className="form-input" value={buyer.name}
                onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="vp-email" className={LABEL}>E-mail</label>
              <input
                id="vp-email" type="email" required maxLength={160} autoComplete="email" placeholder="seu@email.com"
                className="form-input" value={buyer.email} aria-describedby="vp-email-hint"
                onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
              />
              <p id="vp-email-hint" className="text-[11.5px] mt-1.5 text-text-muted">
                O código também fica visível na página de confirmação, logo após o pagamento.
              </p>
            </div>
            <div>
              <label htmlFor="vp-phone" className={LABEL}>WhatsApp</label>
              <input
                id="vp-phone" type="tel" required inputMode="numeric" autoComplete="tel-national"
                placeholder="(11) 99999-9999" pattern="\(\d{2}\) \d{4,5}-\d{4}" title="Informe o número com DDD"
                className="form-input" value={buyer.phone}
                onChange={(e) => setBuyer({ ...buyer, phone: maskPhone(e.target.value) })}
              />
            </div>
            {/* Campo-armadilha contra robôs */}
            <input
              type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="hidden" value={buyer.website}
              onChange={(e) => setBuyer({ ...buyer, website: e.target.value })}
            />
          </div>
        </section>
      </div>

      {/* Resumo */}
      <aside className="lg:sticky lg:top-28">
        <div
          className="relative rounded-2xl overflow-hidden p-7 sm:p-8"
          style={{
            background: "linear-gradient(145deg, #2B221B 0%, #3B2E24 60%, #2B221B 100%)",
            border: "1px solid rgba(201,151,58,0.35)",
            boxShadow: "0 30px 70px -30px rgba(43,34,27,0.65)",
          }}
        >
          <div aria-hidden className="absolute -top-24 -right-24 w-56 h-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,200,130,0.18) 0%, transparent 70%)" }} />
          <div aria-hidden className="absolute inset-2.5 rounded-xl pointer-events-none" style={{ border: "1px solid rgba(232,200,130,0.14)" }} />

          <div className="relative">
            <p className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase" style={{ color: "#C9973A" }}>
              <Sparkles size={12} /> Resumo do presente
            </p>

            <dl className="mt-6 flex flex-col gap-5">
              <div>
                <dt className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>Presente</dt>
                <dd className="text-[22px] font-light text-white leading-snug mt-1" style={cormorant}>{what}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>Para</dt>
                <dd className="text-[19px] font-light leading-snug mt-1 break-words" style={{ ...cormorant, color: "#F3E6CC" }}>{forWhom}</dd>
              </div>
            </dl>

            <div className="my-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(232,200,130,0.45), transparent)" }} />

            <div className="flex items-end justify-between gap-4">
              <span className="text-[10px] tracking-[0.2em] uppercase pb-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>Total</span>
              <span className="text-[42px] font-light leading-none" style={{ ...cormorant, color: "#E8C882" }}>
                {amountOk ? brl(amount) : "—"}
              </span>
            </div>

            {error && (
              <p role="alert" className="mt-6 rounded-lg px-4 py-3 text-[13px] leading-5" style={{ background: "rgba(155,44,44,0.18)", border: "1px solid rgba(230,120,120,0.35)", color: "#FBDADA" }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-gold w-full justify-center mt-7 disabled:opacity-70 disabled:cursor-wait">
              {busy ? <><Loader2 size={14} className="animate-spin" /> {redirecting ? "Abrindo pagamento…" : "Preparando…"}</> : <>Ir para o pagamento <ArrowRight size={13} /></>}
            </button>

            <p className="flex items-start gap-2 mt-5 text-[11.5px] leading-5" style={{ color: "rgba(255,255,255,0.55)" }}>
              <ShieldCheck size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#C9973A" }} />
              Pagamento seguro pela InfinitePay · Pix ou cartão em até 12x · válido por {months} meses
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}
