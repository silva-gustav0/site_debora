"use client";

import type { CSSProperties, ReactNode } from "react";
import { type Interest, siteWhatsapp, track } from "@/lib/site-tracking";
import { gateOffer, useAccount } from "@/lib/account-store";

/** Link para o WhatsApp da Débora (mensagem sobre o interesse) que registra o clique; em promoção, oferece o cadastro antes. */
export default function WhatsAppLink({ phone, interest, from, className, style, children }: {
  phone: string; interest: Interest; from: string; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  const { account } = useAccount();
  const href = siteWhatsapp(phone, interest, account?.discount?.state === "disponivel" ? account.discount.pct : 0);
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}
      data-track={interest.kind} data-track-id={interest.id} data-track-name={interest.name}
      onClick={(e) => {
        if (interest.kind === "promocao" && gateOffer(e, { id: interest.id, name: interest.name, href })) return;
        track("whatsapp", `${from}:${interest.kind}:${interest.id}`);
      }}
    >
      {children}
    </a>
  );
}
