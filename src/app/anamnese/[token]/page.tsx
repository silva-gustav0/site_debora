import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { submitAnamnesisByToken } from "@/app/actions/public";
import AnamnesisForm from "@/components/painel/AnamnesisForm";
import { getAnamnesisLink } from "@/lib/anamnesis-link";
import { dateSP, fmtDate, fmtTime } from "@/lib/format";

export const metadata: Metadata = { title: "Ficha de anamnese · Clínica Débora Silva", robots: { index: false, follow: false } };

const CLOSED = {
  expired: "Este link expirou. Por segurança, ele vale por 2 horas. Peça um novo link à clínica pelo WhatsApp.",
  revoked: "Este link foi substituído por um mais recente. Use o último link que a clínica enviou.",
  invalid: "Link não encontrado. Confira se copiou o endereço completo ou peça um novo à clínica.",
};

/** Ficha de anamnese preenchida pelo cliente, sem login, pelo link único enviado no agendamento. */
export default async function AnamnesisPage({ params }: PageProps<"/anamnese/[token]">) {
  const link = await getAnamnesisLink((await params).token);
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: "linear-gradient(160deg, #FBF7EE 0%, #FDFAF7 45%, #FFF8E7 100%)" }}>
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex justify-center mb-8">
          <Image src="/images/clinica/logo.png" alt="Clínica Débora Silva" width={1052} height={577} priority className="h-20 w-auto" />
        </Link>
        <article className="rounded-3xl bg-white overflow-hidden shadow-[0_20px_70px_rgba(107,74,16,0.12)] border border-[#EEDFBF]">
          <div className="px-7 pt-7 pb-6" style={{ background: "linear-gradient(135deg, #2B221B 0%, #48392B 100%)" }}>
            <p className="text-[10.5px] tracking-[0.28em] uppercase" style={{ color: "#E8C882" }}>
              {link.state === "ok" && link.firstName ? `Olá, ${link.firstName}` : "Ficha de anamnese"}
            </p>
            <h1 className="text-4xl font-light text-white mt-2 leading-tight">Ficha de anamnese</h1>
            {link.state === "ok" && link.startsAt && (
              <p className="text-sm mt-3" style={{ color: "#E8DCC8" }}>{link.service} · {fmtDate(dateSP(link.startsAt))} às {fmtTime(link.startsAt)}</p>
            )}
          </div>
          <div className="px-7 py-6">
            {link.state === "ok" ? (
              <>
                <p className="text-sm text-[#6B5A4B] mb-6">
                  Essas informações ajudam a escolher o cuidado mais seguro para você e ficam guardadas só na sua ficha da clínica.
                  O link vale até às <strong>{fmtTime(link.expiresAt)}</strong>.
                </p>
                <AnamnesisForm a={link.anamnesis} hidden={{ token: link.token }} action={submitAnamnesisByToken} submitLabel="Enviar ficha" />
              </>
            ) : (
              <p role="alert" className="text-sm text-[#6B5A4B]">{CLOSED[link.state]}</p>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
