"use client";

import type { CSSProperties, ReactNode } from "react";
import { type Interest, siteWhatsapp, track } from "@/lib/site-tracking";

/** Link para o WhatsApp da Débora (mensagem sobre o interesse) que registra o clique; para componentes do servidor. */
export default function WhatsAppLink({ phone, interest, from, className, style, children }: {
  phone: string; interest: Interest; from: string; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <a
      href={siteWhatsapp(phone, interest)} target="_blank" rel="noopener noreferrer" className={className} style={style}
      data-track={interest.kind} data-track-id={interest.id} data-track-name={interest.name}
      onClick={() => track("whatsapp", `${from}:${interest.kind}:${interest.id}`)}
    >
      {children}
    </a>
  );
}
