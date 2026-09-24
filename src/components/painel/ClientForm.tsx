import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { createClientAction, updateClientAction } from "@/app/painel/actions";
import { formatPhone, SOURCE_LABEL, STAGE_LABEL } from "@/lib/format";
import type { ClientRow } from "@/lib/types";

/** Cadastro/edição dos dados da cliente. */
export default function ClientForm({ client }: { client?: ClientRow }) {
  const c = client;
  return (
    <ActionForm action={c ? updateClientAction : createClientAction} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label className="sm:col-span-2 lg:col-span-1">
        <span className="p-label">Nome completo *</span>
        <input name="name" required minLength={2} defaultValue={c?.name} className="p-input" />
      </label>
      <label>
        <span className="p-label">WhatsApp</span>
        <input name="phone" inputMode="tel" defaultValue={formatPhone(c?.phone)} placeholder="(11) 99999-9999" className="p-input" />
      </label>
      <label>
        <span className="p-label">E-mail</span>
        <input name="email" type="email" defaultValue={c?.email ?? ""} className="p-input" />
      </label>
      <label>
        <span className="p-label">Nascimento</span>
        <input name="birth_date" type="date" defaultValue={c?.birth_date ?? ""} className="p-input" />
      </label>
      <label>
        <span className="p-label">CPF</span>
        <input name="cpf" inputMode="numeric" defaultValue={c?.cpf ?? ""} placeholder="Para recibos e termo" className="p-input" />
      </label>
      <label>
        <span className="p-label">Instagram</span>
        <input name="instagram" defaultValue={c?.instagram ?? ""} placeholder="@usuario" className="p-input" />
      </label>
      <label className="sm:col-span-2">
        <span className="p-label">Endereço</span>
        <input name="address" defaultValue={c?.address ?? ""} className="p-input" />
      </label>
      <label>
        <span className="p-label">Profissão</span>
        <input name="occupation" defaultValue={c?.occupation ?? ""} className="p-input" />
      </label>
      <label>
        <span className="p-label">Como conheceu</span>
        <select name="source" defaultValue={c?.source ?? "instagram"} className="p-input">
          {Object.entries(SOURCE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span className="p-label">Etapa no funil</span>
        <select name="stage" defaultValue={c?.stage ?? "cliente"} className="p-input">
          {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label>
        <span className="p-label">Etiquetas</span>
        <input name="tags" defaultValue={c?.tags.join(", ")} placeholder="pele sensível, noivas" className="p-input" />
      </label>
      <label className="sm:col-span-2 lg:col-span-3">
        <span className="p-label">Observações</span>
        <textarea name="notes" rows={2} defaultValue={c?.notes ?? ""} placeholder="Preferências, como gosta de ser atendida…" className="p-input resize-y" />
      </label>
      <label className="flex items-center gap-2 text-sm text-[#6B5A4B] sm:col-span-2 lg:col-span-3">
        <input type="checkbox" name="marketing_opt_in" defaultChecked={c?.marketing_opt_in ?? true} className="accent-[#82590F]" />
        Aceita receber lembretes e promoções pelo WhatsApp (LGPD)
      </label>
      <div className="sm:col-span-2 lg:col-span-3">
        <SubmitButton pendingText="Salvando…">{c ? "Salvar dados" : "Cadastrar cliente"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
