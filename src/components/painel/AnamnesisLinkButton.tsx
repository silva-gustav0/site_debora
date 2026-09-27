"use client";

import { useState, useTransition } from "react";
import { ClipboardList, Copy, Loader2, MessageCircle } from "lucide-react";
import { createAnamnesisLink } from "@/app/painel/actions";
import { fmtTime, whatsappLink } from "@/lib/format";

/** Gera o link único de anamnese do agendamento e abre o WhatsApp do cliente com a mensagem pronta. */
export default function AnamnesisLinkButton({ appointmentId, phone, greeting, status }: {
  appointmentId: string; phone: string | null; greeting: string; status: string | null;
}) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const message = (url: string) => `${greeting} Para seu atendimento, preencha sua ficha de anamnese neste link (válido por 2 horas): ${url}`;

  const generate = () => {
    const tab = phone ? window.open("", "_blank") : null;
    setError(null); setCopied(false);
    start(async () => {
      const r = await createAnamnesisLink(appointmentId);
      if (!r.ok) { tab?.close(); setError(r.message); return; }
      setLink(r);
      const wa = whatsappLink(phone, message(r.url));
      if (tab && wa) tab.location.href = wa; else tab?.close();
    });
  };
  const copy = async () => { await navigator.clipboard.writeText(link ? message(link.url) : ""); setCopied(true); };

  return (
    <section>
      <p className="p-label">Anamnese</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={generate} disabled={pending} className="p-btn-ghost p-btn-sm">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <ClipboardList size={13} />} {phone ? "Enviar link de anamnese" : "Gerar link de anamnese"}
        </button>
        {link && (
          <>
            {phone && <a href={whatsappLink(phone, message(link.url)) ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm"><MessageCircle size={13} /> Abrir WhatsApp de novo</a>}
            <button type="button" onClick={copy} className="p-btn-ghost p-btn-sm"><Copy size={13} /> {copied ? "Copiado!" : "Copiar mensagem"}</button>
          </>
        )}
      </div>
      {link && <p className="text-xs text-[#857566] mt-2 break-all">Link único, vale até {fmtTime(link.expiresAt)}: <a href={link.url} target="_blank" className="underline">{link.url}</a></p>}
      {!link && status && <p className="text-xs text-[#857566] mt-2">{status}</p>}
      {error && <p role="alert" className="text-xs text-[#9B2C2C] mt-2">{error}</p>}
    </section>
  );
}
