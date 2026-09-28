"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, MessageCircle, Printer } from "lucide-react";

const POLL_MS = 4000;
const POLL_MAX = 30; // ~2 minutos

/** Enquanto o pagamento não é confirmado, recarrega os dados da página a cada 4 s. */
export function PaymentWatcher({ whatsapp }: { whatsapp: string | null }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks > POLL_MAX) {
        window.clearInterval(id);
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [router]);

  if (!timedOut) {
    return (
      <div className="flex flex-col items-center" role="status" aria-live="polite">
        <span className="relative flex w-16 h-16 items-center justify-center">
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(201,151,58,0.18)" }} />
          <span className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}>
            <Loader2 size={24} className="text-white animate-spin" />
          </span>
        </span>
        <p className="mt-6 text-[13px] text-text-muted">Isso costuma levar poucos segundos. Não precisa recarregar a página.</p>
      </div>
    );
  }

  return (
    <div role="alert" className="flex flex-col items-center gap-5">
      <p className="text-[14px] leading-6 text-text-secondary max-w-sm">
        Ainda não recebemos a confirmação. Se você já pagou, fale com a gente no WhatsApp que resolvemos rapidinho.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <MessageCircle size={14} /> Falar no WhatsApp
          </a>
        )}
        <button type="button" onClick={() => window.location.reload()} className="btn-outline">
          Verificar de novo
        </button>
      </div>
    </div>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* navegador sem permissão: o código continua visível para copiar à mão */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="print:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10.5px] tracking-[0.18em] uppercase transition-colors hover:bg-[rgba(232,200,130,0.14)]"
      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#E8C882", border: "1px solid rgba(232,200,130,0.4)" }}
      aria-label={copied ? "Código copiado" : `Copiar código ${code}`}
    >
      {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
    </button>
  );
}

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-outline justify-center">
      <Printer size={14} /> Imprimir
    </button>
  );
}
