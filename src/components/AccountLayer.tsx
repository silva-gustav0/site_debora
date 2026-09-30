"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckCircle2, Gift, LogOut, MessageCircle, X } from "lucide-react";
import AccountForm from "./AccountForm";
import { closeAccount, loadAccount, signOutAccount, skipAccount, useAccount } from "@/lib/account-store";
import { dateSP, fmtDate, fmtTime, fmtWeekday } from "@/lib/format";
import { siteWhatsapp, track, welcomeWhatsapp } from "@/lib/site-tracking";
import { WELCOME_PCT } from "@/lib/welcome";

const title = "text-[26px] leading-tight font-light text-bronze-800";

/** Janela de conta do site: cadastro/entrada, "minha conta" e o passo seguinte (agendar ou WhatsApp). */
export default function AccountLayer({ clinicPhone }: { clinicPhone: string }) {
  const { account, modal } = useAccount();
  const [done, setDone] = useState<{ isNew: boolean } | null>(null);
  const booking = usePathname() === "/" ? "#agendamento" : "/#agendamento";

  useEffect(() => { loadAccount(); }, []);
  useEffect(() => {
    if (!modal) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") closeAccount(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [modal]);
  if (!modal) return null;

  const close = () => { closeAccount(); setDone(null); };
  const offer = modal.kind === "oferta" ? modal : null;
  const pct = account?.discount?.state === "disponivel" ? account.discount.pct : 0;
  const offerHref = offer ? siteWhatsapp(clinicPhone, { kind: "promocao", id: offer.id, name: offer.name }, pct) : "#";

  let body: React.ReactNode;
  if (account && (done || modal.kind === "conta")) {
    body = (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={28} className="text-[#1F6B3A] flex-shrink-0" />
          <h2 className={title}>{done?.isNew ? `Seus ${WELCOME_PCT}% estão garantidos!` : `Olá, ${account.firstName}!`}</h2>
        </div>
        {account.discount && account.discount.state !== "usado" && (
          <p className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF6DD", color: "#7A5510", border: "1px solid #EED9A0" }}>
            <Gift size={16} className="mt-0.5 flex-shrink-0" />
            {account.discount.state === "disponivel"
              ? `Você tem ${account.discount.pct}% de desconto de boas-vindas no seu primeiro atendimento. Ele entra sozinho quando você agendar.`
              : `Seu desconto de ${account.discount.pct}% já está reservado no seu próximo atendimento.`}
          </p>
        )}
        {account.upcoming.length > 0 && (
          <div>
            <p className="text-[11px] tracking-widest uppercase text-text-muted mb-2">Seus próximos horários</p>
            <ul className="flex flex-col gap-2">
              {account.upcoming.map((a) => (
                <li key={a.token}>
                  <a href={`/meu-agendamento/${a.token}`} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-[#FBF7EE]" style={{ border: "1px solid #EEDFBF" }}>
                    <CalendarDays size={16} className="text-bronze-700" />
                    <span className="flex-1 text-sm">
                      <strong className="font-normal text-bronze-800">{a.service}</strong><br />
                      {fmtWeekday(dateSP(a.startsAt), "long")}, {fmtDate(a.startsAt)} às {fmtTime(a.startsAt)}
                      {a.status === "solicitado" && " · aguardando confirmação"}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {offer ? (
            <a href={offerHref} target="_blank" rel="noopener noreferrer" onClick={() => { track("whatsapp", `cadastro:promocao:${offer.id}`); close(); }} className="btn-primary justify-center">
              <MessageCircle size={14} /> Continuar para o WhatsApp
            </a>
          ) : (
            <a href={booking} onClick={close} className="btn-primary justify-center"><CalendarDays size={14} /> Agendar agora</a>
          )}
          {pct > 0 && !offer && (
            <a href={welcomeWhatsapp(clinicPhone, account.firstName, pct)} target="_blank" rel="noopener noreferrer" onClick={() => { track("whatsapp", "cadastro:boas-vindas"); close(); }} className="btn-outline justify-center">
              <MessageCircle size={14} /> Resgatar os {pct}% pelo WhatsApp
            </a>
          )}
          {modal.kind === "conta" && (
            <button onClick={() => signOutAccount()} className="inline-flex items-center justify-center gap-1.5 text-xs text-text-muted underline"><LogOut size={12} /> Sair da conta</button>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className={title}>
            {offer ? "Antes de continuar…" : modal.kind === "boas-vindas" ? `Ganhe ${WELCOME_PCT}% no primeiro atendimento` : "Entrar ou criar conta"}
          </h2>
          <p className="text-sm font-light text-text-secondary leading-6 mt-2">
            {offer ? `Entre ou crie sua conta em segundos para garantir a promoção “${offer.name}”. Clientes novos ainda ganham ${WELCOME_PCT}% de desconto.`
              : "Só o seu WhatsApp e uma senha. Com a conta você agenda mais rápido e acompanha seus horários."}
          </p>
        </div>
        <AccountForm clinicPhone={clinicPhone} onDone={(isNew) => setDone({ isNew })} />
        {offer && (
          <a href={offer.href} target="_blank" rel="noopener noreferrer" onClick={() => { skipAccount(); track("whatsapp", `sem-cadastro:promocao:${offer.id}`); close(); }} className="text-center text-xs text-text-muted underline">
            Continuar sem cadastro
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Conta no site">
      <button aria-label="Fechar" onClick={close} className="absolute inset-0 bg-[rgba(43,34,27,0.45)] backdrop-blur-[2px]" />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-[0_24px_70px_rgba(43,34,27,0.35)]" style={{ border: "1px solid #EEDFBF" }}>
        <div aria-hidden className="absolute top-0 left-8 right-8 h-[3px] rounded-b" style={{ background: "linear-gradient(90deg,#C9973A,#F3DDA6,#C9973A)" }} />
        <button onClick={close} aria-label="Fechar" className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:bg-[#FBF7EE]"><X size={18} /></button>
        {body}
      </div>
    </div>
  );
}
