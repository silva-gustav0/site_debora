"use client";

import { useState } from "react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { createManualVoucher } from "@/app/painel/voucher-actions";
import { brl, METHOD_LABEL } from "@/lib/format";

type ServiceOption = { id: string; name: string; price: number };

/** Formulário de "Novo voucher": alterna entre serviço/valor e venda/cortesia sem recarregar a página. */
export default function VoucherForm({
  services, voucherMin, voucherMax,
}: { services: ServiceOption[]; voucherMin: number; voucherMax: number }) {
  const [kind, setKind] = useState<"servico" | "valor">(services.length ? "servico" : "valor");
  const [forSelf, setForSelf] = useState(true);
  const [origem, setOrigem] = useState<"venda" | "cortesia">("venda");

  return (
    <ActionForm action={createManualVoucher} resetOnSuccess className="grid gap-4">
      <fieldset className="rounded-xl bg-[#FDFAF5] border border-[#F0E6D6] p-3">
        <legend className="p-label px-1">Tipo de voucher</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio" name="kind" value="servico" checked={kind === "servico"}
              onChange={() => setKind("servico")} disabled={!services.length} className="accent-[#82590F]"
            />
            Serviço específico
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio" name="kind" value="valor" checked={kind === "valor"}
              onChange={() => setKind("valor")} className="accent-[#82590F]"
            />
            Valor (vale-presente)
          </label>
        </div>
        {!services.length && <p className="text-xs text-[#857566] mt-1.5">Nenhum serviço ativo com preço cadastrado para virar voucher.</p>}
      </fieldset>

      {kind === "servico" ? (
        <label>
          <span className="p-label">Serviço</span>
          <select name="service_id" required defaultValue="" className="p-input">
            <option value="" disabled>Selecione…</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {brl(s.price)}</option>)}
          </select>
        </label>
      ) : (
        <label>
          <span className="p-label">Valor (R$)</span>
          <input name="amount" required inputMode="decimal" placeholder="0,00" className="p-input p-num" />
          <span className="text-xs text-[#857566]">Entre {brl(voucherMin)} e {brl(voucherMax)}.</span>
        </label>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <label className="sm:col-span-1">
          <span className="p-label">Nome de quem comprou</span>
          <input name="buyer_name" required minLength={3} className="p-input" />
        </label>
        <label>
          <span className="p-label">WhatsApp</span>
          <input name="buyer_phone" inputMode="numeric" placeholder="(11) 99999-9999" className="p-input" />
        </label>
        <label>
          <span className="p-label">E-mail (opcional)</span>
          <input name="buyer_email" type="email" className="p-input" />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#6B5A4B]">
        <input
          type="checkbox" name="for_self" checked={forSelf}
          onChange={(e) => setForSelf(e.target.checked)} className="accent-[#82590F]"
        />
        É para a própria compradora
      </label>

      {!forSelf && (
        <div className="grid sm:grid-cols-2 gap-3">
          <label>
            <span className="p-label">Nome de quem vai receber</span>
            <input name="recipient_name" required minLength={2} className="p-input" />
          </label>
          <label>
            <span className="p-label">Mensagem (opcional)</span>
            <input name="message" maxLength={300} className="p-input" />
          </label>
        </div>
      )}

      <fieldset className="rounded-xl bg-[#FDFAF5] border border-[#F0E6D6] p-3">
        <legend className="p-label px-1">Origem</legend>
        <div className="flex flex-wrap gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio" name="origem" value="venda" checked={origem === "venda"}
              onChange={() => setOrigem("venda")} className="accent-[#82590F]"
            />
            Venda na clínica
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio" name="origem" value="cortesia" checked={origem === "cortesia"}
              onChange={() => setOrigem("cortesia")} className="accent-[#82590F]"
            />
            Cortesia (sem cobrança)
          </label>
        </div>
        {origem === "venda" && (
          <label>
            <span className="p-label">Forma de pagamento</span>
            <select name="method" defaultValue="pix" className="p-input">
              {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        )}
      </fieldset>

      <div><SubmitButton className="p-btn p-btn-gold">Criar voucher</SubmitButton></div>
    </ActionForm>
  );
}
