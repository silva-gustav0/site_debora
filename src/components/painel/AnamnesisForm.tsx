import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { saveAnamnesis } from "@/app/painel/actions";
import type { Anamnesis } from "@/lib/types";

export const FITZPATRICK = [
  { v: "I", l: "I · Muito clara, sempre queima" },
  { v: "II", l: "II · Clara, queima fácil" },
  { v: "III", l: "III · Morena clara" },
  { v: "IV", l: "IV · Morena moderada" },
  { v: "V", l: "V · Morena escura" },
  { v: "VI", l: "VI · Negra" },
];
export const SKIN_TYPES = ["Normal", "Seca", "Oleosa", "Mista", "Sensível", "Acneica"];
export const CONCERNS = [
  "Acne", "Manchas / melasma", "Linhas de expressão", "Flacidez", "Poros dilatados", "Olheiras", "Rosácea",
  "Oleosidade", "Desidratação", "Celulite", "Gordura localizada", "Retenção de líquido", "Estrias", "Tensão muscular", "Estresse",
];
export const CONDITIONS = [
  "Hipertensão", "Diabetes", "Problemas cardíacos", "Marca-passo", "Epilepsia", "Trombose / varizes", "Câncer (atual ou histórico)",
  "Problemas de tireoide", "Herpes", "Queloide", "Doença autoimune", "Implante metálico", "Cirurgia recente", "Problemas renais",
];

function Check({ name, label, checked }: { name: string; label: string; checked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#2B221B] rounded-lg px-2.5 py-1.5 border border-[#F0E8DB] bg-white has-[:checked]:bg-[#FAF3E6] has-[:checked]:border-[#E3CFA0]">
      <input type="checkbox" name={name} defaultChecked={checked} className="accent-[#82590F]" /> {label}
    </label>
  );
}

function Multi({ name, label, options, values }: { name: string; label: string; options: string[]; values?: string[] }) {
  return (
    <fieldset>
      <legend className="p-label">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o} className="text-[13px] rounded-full px-3 py-1 border border-[#EAE0D0] bg-white cursor-pointer has-[:checked]:bg-[#2B221B] has-[:checked]:text-white has-[:checked]:border-[#2B221B] transition-colors">
            <input type="checkbox" name={name} value={o} defaultChecked={values?.includes(o)} className="sr-only" /> {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Ficha de anamnese estruturada para estética facial e corporal. */
export default function AnamnesisForm({ clientId, a }: { clientId: string; a: Anamnesis }) {
  return (
    <ActionForm action={saveAnamnesis} className="flex flex-col gap-6">
      <input type="hidden" name="id" value={clientId} />

      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          <span className="p-label">Fototipo (Fitzpatrick)</span>
          <select name="fitzpatrick" defaultValue={a.fitzpatrick ?? ""} className="p-input">
            <option value="">—</option>
            {FITZPATRICK.map((f) => <option key={f.v} value={f.v}>{f.l}</option>)}
          </select>
        </label>
        <label>
          <span className="p-label">Tipo de pele</span>
          <select name="skin_type" defaultValue={a.skin_type ?? ""} className="p-input">
            <option value="">—</option>
            {SKIN_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <Multi name="concerns" label="Queixas principais" options={CONCERNS} values={a.concerns} />
      <Multi name="conditions" label="Condições de saúde" options={CONDITIONS} values={a.conditions} />

      <fieldset>
        <legend className="p-label">Contraindicações e hábitos</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Check name="pregnant" label="Gestante" checked={a.pregnant} />
          <Check name="breastfeeding" label="Amamentando" checked={a.breastfeeding} />
          <Check name="uses_acids" label="Usa ácidos / retinoides" checked={a.uses_acids} />
          <Check name="sunscreen" label="Usa protetor solar" checked={a.sunscreen} />
          <Check name="smoker" label="Fumante" checked={a.smoker} />
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          <span className="p-label">Exposição ao sol</span>
          <select name="sun_exposure" defaultValue={a.sun_exposure ?? ""} className="p-input">
            <option value="">—</option>
            <option>Baixa</option><option>Moderada</option><option>Alta</option>
          </select>
        </label>
        <label>
          <span className="p-label">Ingestão de água</span>
          <select name="water_intake" defaultValue={a.water_intake ?? ""} className="p-input">
            <option value="">—</option>
            <option>Menos de 1 L/dia</option><option>1 a 2 L/dia</option><option>Mais de 2 L/dia</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="p-label">Alergias (produtos, ativos, medicamentos)</span>
          <textarea name="allergies_detail" rows={2} defaultValue={a.allergies_detail ?? ""} className="p-input resize-y" />
        </label>
        <label className="sm:col-span-2">
          <span className="p-label">Medicamentos em uso</span>
          <textarea name="medications" rows={2} defaultValue={a.medications ?? ""} className="p-input resize-y" />
        </label>
        <label className="sm:col-span-2">
          <span className="p-label">Procedimentos estéticos anteriores</span>
          <textarea name="previous_procedures" rows={2} defaultValue={a.previous_procedures ?? ""} placeholder="Peelings, laser, toxina, preenchimentos, cirurgias…" className="p-input resize-y" />
        </label>
        <label className="sm:col-span-2">
          <span className="p-label">Objetivos do cliente</span>
          <textarea name="goals" rows={2} defaultValue={a.goals ?? ""} className="p-input resize-y" />
        </label>
      </div>

      <div><SubmitButton pendingText="Salvando…">Salvar anamnese</SubmitButton></div>
    </ActionForm>
  );
}
