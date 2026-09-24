import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, Clock, MapPin, MessageCircle } from "lucide-react";
import { getBookingByToken } from "@/app/actions/public";
import { brl, fmtDate, fmtTime, fmtWeekday, dateSP, whatsappLink } from "@/lib/format";
import CancelBooking from "./CancelBooking";

export const metadata: Metadata = {
  title: "Meu agendamento · Clínica Debora Silva",
  robots: { index: false, follow: false },
};

const STATUS_TEXT: Record<string, { label: string; color: string; text: string }> = {
  solicitado: { label: "Aguardando confirmação", color: "#A87B25", text: "Recebemos seu pedido. Vamos confirmar pelo WhatsApp em breve." },
  confirmado: { label: "Confirmado", color: "#2E7D4F", text: "Está tudo certo! Te esperamos." },
  concluido: { label: "Realizado", color: "#6B4C52", text: "Obrigada pela visita! Esperamos ver você de novo em breve." },
  cancelado: { label: "Cancelado", color: "#9B2C2C", text: "Este agendamento foi cancelado." },
  faltou: { label: "Não compareceu", color: "#9B2C2C", text: "Sentimos sua falta. Que tal remarcar?" },
};

export default async function MyBookingPage({ params }: PageProps<"/meu-agendamento/[token]">) {
  const { token } = await params;
  const b = await getBookingByToken(token);
  if (!b) notFound();

  const day = dateSP(b.startsAt);
  const st = STATUS_TEXT[b.status] ?? STATUS_TEXT.solicitado;
  const upcoming = ["solicitado", "confirmado"].includes(b.status);
  const wa = whatsappLink(b.whatsapp, `Olá! Sou ${b.clientFirstName} e tenho um agendamento de ${b.serviceName} em ${fmtDate(day)} às ${fmtTime(b.startsAt)}.`);

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: "linear-gradient(160deg, #FFF5F7 0%, #FDFAF7 45%, #FFF8E7 100%)" }}
    >
      <div className="max-w-lg mx-auto">
        <Link href="/" className="flex justify-center mb-8">
          <Image src="/images/clinica/logo.png" alt={b.clinicName} width={974} height={414} priority className="h-14 w-auto" />
        </Link>

        <article className="rounded-3xl bg-white overflow-hidden shadow-[0_20px_70px_rgba(139,58,66,0.12)] border border-[#F9C7CE]">
          <div className="px-7 pt-7 pb-6" style={{ background: "linear-gradient(135deg, #2C1A1E 0%, #4A2830 100%)" }}>
            <p className="text-[10.5px] tracking-[0.28em] uppercase" style={{ color: "#E8C882" }}>
              {b.clientFirstName ? `Olá, ${b.clientFirstName}` : "Seu horário"}
            </p>
            <h1 className="text-4xl font-light text-white mt-2 leading-tight">{b.serviceName}</h1>
            <span
              className="inline-block mt-4 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: `1px solid ${st.color}` }}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: st.color }} />
              {st.label}
            </span>
          </div>

          <div className="px-7 py-6 flex flex-col gap-4">
            <p className="text-sm text-text-secondary">{st.text}</p>
            <ul className="flex flex-col gap-3 text-[15px] text-[#2C1A1E]">
              <li className="flex items-center gap-3">
                <CalendarDays size={18} className="text-rose-500" />
                {fmtWeekday(day, "long")}, {fmtDate(day, { month: "long" })}
              </li>
              <li className="flex items-center gap-3">
                <Clock size={18} className="text-rose-500" /> {fmtTime(b.startsAt)} às {fmtTime(b.endsAt)}
                {b.price > 0 && <span className="text-text-muted">· {brl(b.price)}</span>}
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-rose-500 mt-0.5" />
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(b.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-600 underline decoration-rose-200 underline-offset-4"
                >
                  {b.address}
                </a>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {upcoming && (
                <a href={`/meu-agendamento/${b.token}/ics`} className="btn-outline justify-center flex-1">
                  <CalendarPlus size={14} /> Salvar na agenda
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary justify-center flex-1">
                  <MessageCircle size={14} /> {upcoming ? "Remarcar" : "Agendar de novo"}
                </a>
              )}
            </div>

            {upcoming && (
              <div className="border-t border-rose-50 pt-4">
                {b.canCancel ? (
                  <CancelBooking token={b.token} />
                ) : (
                  <p className="text-xs text-text-muted">
                    Para cancelar com menos de {b.cancelMinHours}h de antecedência, fale conosco pelo WhatsApp.
                  </p>
                )}
              </div>
            )}
          </div>
        </article>

        <p className="text-center text-xs text-text-muted mt-6">
          Guarde este link para consultar seu agendamento. · <Link href="/" className="hover:text-rose-600">{b.clinicName}</Link>
        </p>
      </div>
    </main>
  );
}
