"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Gift, Loader2 } from "lucide-react";
import { checkPhone, loginAccount, registerAccount, type PhoneStatus } from "@/app/actions/account";
import { loadAccount } from "@/lib/account-store";
import { maskPhone, whatsappLink } from "@/lib/format";
import { ATTENDANT } from "@/lib/site-tracking";
import { WELCOME_PCT } from "@/lib/welcome";

const label = "block text-[11px] tracking-widest uppercase text-text-muted mb-2";

/**
 * Cadastro/entrada por número: primeiro o WhatsApp; o site descobre sozinho se é cliente nova (nome + senha, ganha 5%),
 * cliente que já tem ficha (só cria a senha) ou quem já tem conta (digita a senha).
 */
export default function AccountForm({ clinicPhone, onDone }: { clinicPhone: string; onDone: (isNew: boolean) => void }) {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PhoneStatus | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (!status) {
        const r = await checkPhone(phone);
        if (r.ok) setStatus(r.status); else setError(r.message);
        return;
      }
      const r = status === "conta" ? await loginAccount({ phone, password }) : await registerAccount({ name, phone, password });
      if (!r.ok) { setError(r.message); return; }
      await loadAccount(true);
      onDone("isNew" in r && r.isNew === true);
    });
  };

  const forgot = whatsappLink(clinicPhone, `Olá, ${ATTENDANT}! Esqueci a senha do site. Meu número é ${phone}.`);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" style={{ fontFamily: "var(--font-lato), sans-serif" }}>
      <div>
        <label htmlFor="ac-phone" className={label}>Seu WhatsApp</label>
        <input
          id="ac-phone" type="tel" required inputMode="numeric" autoComplete="tel-national" placeholder="(11) 99999-9999"
          className="form-input" value={phone} readOnly={!!status}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
        />
        {status && (
          <button type="button" onClick={() => { setStatus(null); setPassword(""); setError(null); }} className="mt-1.5 text-xs underline text-text-muted">
            Trocar número
          </button>
        )}
      </div>

      {status === "nova" && (
        <>
          <p className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF6DD", color: "#7A5510", border: "1px solid #EED9A0" }}>
            <Gift size={16} className="mt-0.5 flex-shrink-0" />
            <span>Que bom ter você aqui! Clientes novos ganham <strong>{WELCOME_PCT}% de desconto</strong> no primeiro atendimento. Complete o cadastro para garantir.</span>
          </p>
          <div>
            <label htmlFor="ac-name" className={label}>Nome completo</label>
            <input id="ac-name" required minLength={3} autoComplete="name" placeholder="Seu nome" className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </>
      )}
      {status === "cliente" && (
        <p className="rounded-xl px-4 py-3 text-sm" style={{ background: "#EAF6EE", color: "#1F6B3A", border: "1px solid #BFE3CB" }}>
          Você já é nossa cliente! Crie uma senha para agendar mais rápido e acompanhar seus horários.
        </p>
      )}
      {status && (
        <div>
          <label htmlFor="ac-pass" className={label}>{status === "conta" ? "Sua senha" : "Crie uma senha"}</label>
          <div className="relative">
            <input
              id="ac-pass" type={show ? "text" : "password"} required minLength={status === "conta" ? 1 : 8}
              autoComplete={status === "conta" ? "current-password" : "new-password"} placeholder={status === "conta" ? "" : "Pelo menos 8 caracteres"}
              className="form-input pr-11" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
            />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Esconder senha" : "Mostrar senha"} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {status === "conta" && forgot && (
            <a href={forgot} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block text-xs underline text-text-muted">Esqueci minha senha</a>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-sm" style={{ color: "#9B2C2C" }}>{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full justify-center disabled:opacity-70">
        {pending ? <Loader2 size={14} className="animate-spin" /> : null}
        {!status ? "Continuar" : status === "conta" ? "Entrar" : status === "nova" ? `Cadastrar e garantir ${WELCOME_PCT}%` : "Criar senha"}
      </button>
    </form>
  );
}
