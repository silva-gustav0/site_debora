import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { saveAnamnesis } from "@/app/painel/actions";
import { matchOption, type AnamnesisFormDef, type AnamnesisQuestion } from "@/lib/anamnesis-schema";
import type { ActionState, Anamnesis } from "@/lib/types";

function YesNo({ q, value }: { q: AnamnesisQuestion; value: unknown }) {
  const opt = (v: "sim" | "nao", label: string, checked: boolean) => (
    <label className="text-[13px] rounded-full px-3.5 py-1 border border-[#EAE0D0] bg-white cursor-pointer has-[:checked]:bg-[#2B221B] has-[:checked]:text-white has-[:checked]:border-[#2B221B] transition-colors">
      <input type="radio" name={`q_${q.id}`} value={v} defaultChecked={checked} className="sr-only" /> {label}
    </label>
  );
  return (
    <fieldset className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 border border-[#F0E8DB] bg-white">
      <legend className="sr-only">{q.label}</legend>
      <span aria-hidden className="text-sm text-[#2B221B]">{q.label}</span>
      <span className="flex gap-1.5 flex-shrink-0">{opt("sim", "Sim", value === true)}{opt("nao", "Não", value === false)}</span>
    </fieldset>
  );
}

function Question({ q, value }: { q: AnamnesisQuestion; value: unknown }) {
  const name = `q_${q.id}`;
  switch (q.type) {
    case "yes_no":
      return <YesNo q={q} value={value} />;
    case "multi":
      return (
        <fieldset className="sm:col-span-2">
          <legend className="p-label">{q.label}</legend>
          <div className="flex flex-wrap gap-1.5">
            {q.options?.map((o) => (
              <label key={o} className="text-[13px] rounded-full px-3 py-1 border border-[#EAE0D0] bg-white cursor-pointer has-[:checked]:bg-[#2B221B] has-[:checked]:text-white has-[:checked]:border-[#2B221B] transition-colors">
                <input type="checkbox" name={name} value={o} defaultChecked={Array.isArray(value) && value.includes(o)} className="sr-only" /> {o}
              </label>
            ))}
          </div>
        </fieldset>
      );
    case "choice":
      return (
        <label>
          <span className="p-label">{q.label}</span>
          <select name={name} defaultValue={matchOption(q.options, value)} className="p-input">
            <option value="">—</option>
            {q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
      );
    case "text":
      return (
        <label>
          <span className="p-label">{q.label}</span>
          <input name={name} maxLength={300} defaultValue={typeof value === "string" ? value : ""} placeholder={q.placeholder} className="p-input" />
        </label>
      );
    case "long_text":
      return (
        <label className="sm:col-span-2">
          <span className="p-label">{q.label}</span>
          <textarea name={name} rows={2} maxLength={1500} defaultValue={typeof value === "string" ? value : ""} placeholder={q.placeholder} className="p-input resize-y" />
        </label>
      );
  }
}

/** Ficha de anamnese montada a partir do modelo editável (painel ou link enviado ao cliente). */
export default function AnamnesisForm({ a, form, hidden, action = saveAnamnesis, submitLabel = "Salvar anamnese" }: {
  a: Anamnesis; form: AnamnesisFormDef; hidden: Record<string, string>;
  action?: (prev: ActionState, fd: FormData) => Promise<ActionState>; submitLabel?: string;
}) {
  const answers = a as Record<string, unknown>;
  return (
    <ActionForm action={action} className="flex flex-col gap-7">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {form.sections.map((s) => (
        <section key={s.id}>
          <h3 className="p-display text-xl text-[#2B221B] mb-3 pb-1.5 border-b border-[#F0E8DB]">{s.title}</h3>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3">
            {s.questions.map((q) => <Question key={q.id} q={q} value={answers[q.id]} />)}
          </div>
        </section>
      ))}
      <div><SubmitButton pendingText="Enviando…">{submitLabel}</SubmitButton></div>
    </ActionForm>
  );
}
