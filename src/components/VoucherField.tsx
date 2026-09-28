"use client";

import { useState, useTransition } from "react";
import { Gift, Loader2, X, CheckCircle2 } from "lucide-react";
import { checkVoucherCode, type VoucherCheck } from "@/app/actions/vouchers";
import { brl } from "@/lib/format";

export type AppliedVoucher = Extract<VoucherCheck, { ok: true }>;

/** "Tem um voucher?": confere o código no servidor e avisa o agendamento. */
export default function VoucherField({ applied, onApply, onRemove }: {
  applied: AppliedVoucher | null;
  onApply: (v: AppliedVoucher) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await checkVoucherCode(code);
      if (r.ok) { onApply(r); setCode(""); setOpen(false); } else setError(r.message);
    });
  };

  if (applied) {
    return (
      <div className="mb-7 flex items-center gap-3 rounded-xl px-4 py-3.5" role="status"
        style={{ background: "linear-gradient(135deg,#2B221B,#3B2E24)", border: "1px solid rgba(201,151,58,.4)" }}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}>
          <Gift size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "#E8C882" }}>Voucher {applied.code} aplicado</p>
          <p className="text-white text-[17px] leading-snug" style={{ fontFamily: "var(--font-cormorant), serif" }}>
            {applied.kind === "servico"
              ? <>{applied.serviceName} <span className="text-[#E8C882]">· já pago</span></>
              : <>Vale-presente de {brl(applied.balance)} <span className="text-white/60 text-sm">(abatido do valor do serviço)</span></>}
          </p>
        </div>
        <button type="button" onClick={onRemove} aria-label="Remover voucher" className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-7">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-[12px] tracking-wide uppercase rounded-full px-4 py-2 transition-colors hover:bg-[#FBF7EE]"
          style={{ color: "#82590F", border: "1px dashed #C9973A" }}>
          <Gift size={14} /> Tem um voucher ou vale-presente?
        </button>
      ) : (
        <form onSubmit={apply} className="rounded-xl p-4" style={{ background: "#FBF7EE", border: "1px solid #EEDFBF" }}>
          <label htmlFor="bk-voucher" className="block text-[11px] tracking-widest uppercase text-text-muted mb-2">Código do voucher</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input id="bk-voucher" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DS-XXXX-XXXX"
              autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={20} required
              className="form-input flex-1 tracking-[0.2em] font-medium" />
            <button type="submit" disabled={pending || code.replace(/[^A-Z0-9]/gi, "").length < 8} className="btn-primary justify-center disabled:opacity-50">
              {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Aplicar
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn-outline justify-center">Cancelar</button>
          </div>
          {error && <p role="alert" className="text-sm mt-2" style={{ color: "#9B2C2C" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
