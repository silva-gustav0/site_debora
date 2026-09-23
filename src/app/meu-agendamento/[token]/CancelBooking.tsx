"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cancelBookingByToken } from "@/app/actions/public";

export default function CancelBooking({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-text-muted underline underline-offset-4 hover:text-rose-700">
        Preciso cancelar este horário
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="cancel-reason" className="text-xs text-text-secondary">Quer nos contar o motivo? (opcional)</label>
      <textarea
        id="cancel-reason"
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="form-input resize-none text-sm"
      />
      {error && <p role="alert" className="text-xs text-[#9B2C2C]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelBookingByToken(token, reason);
              if (r.ok) router.refresh();
              else setError(r.message);
            })
          }
          className="btn-primary text-xs"
          style={{ background: "#9B2C2C", borderColor: "#9B2C2C" }}
        >
          {pending && <Loader2 size={12} className="animate-spin" />} Confirmar cancelamento
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline text-xs">Voltar</button>
      </div>
    </div>
  );
}
