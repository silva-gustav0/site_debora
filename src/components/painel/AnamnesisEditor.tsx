"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { saveAnamnesisModel } from "@/app/painel/actions";
import { QUESTION_TYPES, type AnamnesisFormDef, type AnamnesisQuestion, type AnamnesisSection, type QuestionType } from "@/lib/anamnesis-schema";

const TYPE_LABEL = Object.fromEntries(QUESTION_TYPES.map((t) => [t.v, t.l])) as Record<QuestionType, string>;
const hasOptions = (t: QuestionType) => t === "choice" || t === "multi";

function move<T>(list: T[], i: number, d: -1 | 1) {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function IconBtn({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={`w-9 h-9 flex items-center justify-center rounded-lg border border-[#EEE5D8] bg-white disabled:opacity-30 ${danger ? "text-[#9B2C2C] hover:bg-[#FFF1F1]" : "text-[#6B5A4B] hover:bg-[#FBF3E2]"}`}>
      {children}
    </button>
  );
}

function QuestionEditor({ q, open, onToggle, onChange, onMove, onRemove, first, last }: {
  q: AnamnesisQuestion; open: boolean; onToggle: () => void; onChange: (q: AnamnesisQuestion) => void;
  onMove: (d: -1 | 1) => void; onRemove: () => void; first: boolean; last: boolean;
}) {
  const [optionsText, setOptionsText] = useState((q.options ?? []).join("\n"));
  const setType = (type: QuestionType) => onChange({ ...q, type, options: hasOptions(type) ? (q.options?.length ? q.options : ["Opção 1", "Opção 2"]) : undefined });
  const missingOptions = hasOptions(q.type) && !(q.options?.length);

  return (
    <li className={`rounded-xl border bg-white ${open ? "border-[#E3CFA0] shadow-sm" : "border-[#EEE5D8]"}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-2 text-left py-1">
          <ChevronDown size={15} className={`flex-shrink-0 text-[#9A6F1E] transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className={`truncate text-[14px] ${q.label ? "text-[#2B221B]" : "text-[#9B2C2C]"}`}>{q.label || "Pergunta sem nome"}</span>
          <span className="flex-shrink-0 text-[10.5px] rounded-full px-2 py-0.5 bg-[#F7F2E9] text-[#857566]">{TYPE_LABEL[q.type]}</span>
          {q.alert && <span className="flex-shrink-0 text-[10.5px] rounded-full px-2 py-0.5 bg-[#FFF3DC] text-[#6A4A10] inline-flex items-center gap-1"><AlertTriangle size={10} /> Alerta</span>}
          {missingOptions && <span className="flex-shrink-0 text-[10.5px] text-[#9B2C2C]">sem opções</span>}
        </button>
        <IconBtn label="Subir pergunta" onClick={() => onMove(-1)} disabled={first}><ArrowUp size={14} /></IconBtn>
        <IconBtn label="Descer pergunta" onClick={() => onMove(1)} disabled={last}><ArrowDown size={14} /></IconBtn>
        <IconBtn label="Excluir pergunta" onClick={onRemove} danger><Trash2 size={14} /></IconBtn>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 grid sm:grid-cols-[1fr_200px] gap-3 fade-in">
          <label>
            <span className="p-label">Pergunta</span>
            <input value={q.label} maxLength={200} onChange={(e) => onChange({ ...q, label: e.target.value })} className="p-input" autoFocus={!q.label} />
          </label>
          <label>
            <span className="p-label">Tipo de resposta</span>
            <select value={q.type} onChange={(e) => setType(e.target.value as QuestionType)} className="p-input">
              {QUESTION_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </label>
          {hasOptions(q.type) && (
            <label className="sm:col-span-2">
              <span className="p-label">Opções (uma por linha)</span>
              <textarea
                rows={Math.min(8, Math.max(3, optionsText.split("\n").length))}
                value={optionsText}
                onChange={(e) => { setOptionsText(e.target.value); onChange({ ...q, options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean) }); }}
                className="p-input resize-y text-[14px]"
              />
            </label>
          )}
          {(q.type === "text" || q.type === "long_text") && (
            <label className="sm:col-span-2">
              <span className="p-label">Exemplo de resposta (opcional)</span>
              <input value={q.placeholder ?? ""} maxLength={200} onChange={(e) => onChange({ ...q, placeholder: e.target.value || undefined })} className="p-input" placeholder="Aparece em cinza dentro do campo" />
            </label>
          )}
          <label className="sm:col-span-2 flex items-start gap-2 text-sm text-[#4A3C30]">
            <input type="checkbox" checked={Boolean(q.alert)} onChange={(e) => onChange({ ...q, alert: e.target.checked || undefined })} className="accent-[#82590F] w-4 h-4 mt-0.5" />
            <span>
              <strong>Gera alerta de saúde:</strong> a resposta aparece em destaque na ficha da cliente e na tela de atendimento
              {q.type === "yes_no" ? " (quando a resposta for “Sim”)." : "."}
            </span>
          </label>
        </div>
      )}
    </li>
  );
}

/** Editor do modelo da ficha de anamnese e do texto do termo de consentimento. */
export default function AnamnesisEditor({ initialForm, initialConsent, customized }: { initialForm: AnamnesisFormDef; initialConsent: string; customized: boolean }) {
  const [sections, setSections] = useState<AnamnesisSection[]>(initialForm.sections);
  const [consent, setConsent] = useState(initialConsent);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const updateSection = (i: number, patch: Partial<AnamnesisSection>) => setSections((ss) => ss.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const updateQuestions = (i: number, fn: (qs: AnamnesisQuestion[]) => AnamnesisQuestion[]) => setSections((ss) => ss.map((s, k) => (k === i ? { ...s, questions: fn(s.questions) } : s)));
  const addQuestion = (i: number) => {
    const id = `q_${Date.now().toString(36)}`;
    updateQuestions(i, (qs) => [...qs, { id, label: "", type: "yes_no" }]);
    setOpen(id);
  };
  const addSection = () => {
    const id = `s_${Date.now().toString(36)}`, qid = `q_${Date.now().toString(36)}`;
    setSections((ss) => [...ss, { id, title: "Nova seção", questions: [{ id: qid, label: "", type: "yes_no" }] }]);
    setOpen(qid);
  };
  const total = sections.reduce((n, s) => n + s.questions.length, 0);

  return (
    <div className="flex flex-col gap-5">
      <ActionForm action={saveAnamnesisModel} className="flex flex-col gap-5">
        <input type="hidden" name="form" value={JSON.stringify({ sections })} />
        <input type="hidden" name="consent" value={consent} />

        <div className="p-card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <h2 className="p-display text-2xl text-[#2B221B]">Perguntas da ficha</h2>
            <span className="text-xs text-[#857566]">{sections.length} seções · {total} perguntas</span>
          </div>
          <p className="text-sm text-[#6B5A4B] mb-5">
            Vale para a ficha no painel e para o link que a cliente preenche. Ao excluir ou mudar uma pergunta, as respostas
            já dadas continuam guardadas na ficha de cada cliente, em “Respostas anteriores”.
          </p>

          <div className="flex flex-col gap-5">
            {sections.map((s, i) => (
              <section key={s.id} className="rounded-2xl border border-[#EEE5D8] bg-[#FBF7F0] p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input value={s.title} maxLength={80} onChange={(e) => updateSection(i, { title: e.target.value })} aria-label="Nome da seção"
                    className="p-input !bg-transparent !border-transparent hover:!border-[#E8DCC8] focus:!bg-white p-display !text-xl flex-1 min-w-0" />
                  <IconBtn label="Subir seção" onClick={() => setSections((ss) => move(ss, i, -1))} disabled={i === 0}><ArrowUp size={14} /></IconBtn>
                  <IconBtn label="Descer seção" onClick={() => setSections((ss) => move(ss, i, 1))} disabled={i === sections.length - 1}><ArrowDown size={14} /></IconBtn>
                  <IconBtn label="Excluir seção" onClick={() => setSections((ss) => ss.filter((_, k) => k !== i))} danger><Trash2 size={14} /></IconBtn>
                </div>
                <ul className="flex flex-col gap-2">
                  {s.questions.map((q, j) => (
                    <QuestionEditor
                      key={q.id} q={q} open={open === q.id} onToggle={() => setOpen(open === q.id ? null : q.id)}
                      onChange={(nq) => updateQuestions(i, (qs) => qs.map((x, k) => (k === j ? nq : x)))}
                      onMove={(d) => updateQuestions(i, (qs) => move(qs, j, d))}
                      onRemove={() => updateQuestions(i, (qs) => qs.filter((_, k) => k !== j))}
                      first={j === 0} last={j === s.questions.length - 1}
                    />
                  ))}
                </ul>
                <button type="button" onClick={() => addQuestion(i)} className="p-btn-ghost p-btn-sm mt-3"><Plus size={13} /> Adicionar pergunta</button>
              </section>
            ))}
          </div>
          <button type="button" onClick={addSection} className="p-btn-ghost mt-4"><Plus size={15} /> Adicionar seção</button>
        </div>

        <div className="p-card p-5">
          <h2 className="p-display text-2xl text-[#2B221B] mb-1">Termo de consentimento</h2>
          <p className="text-sm text-[#6B5A4B] mb-3">
            Sai impresso abaixo da ficha, antes das assinaturas. Deixe uma linha em branco para começar outro parágrafo. Use{" "}
            <code className="bg-white px-1 rounded">{"{nome}"}</code> para o nome da cliente e <code className="bg-white px-1 rounded">{"{clinica}"}</code> para o nome da clínica.
          </p>
          <textarea value={consent} onChange={(e) => setConsent(e.target.value)} rows={12} maxLength={8000} aria-label="Texto do termo de consentimento" className="p-input resize-y text-[14px] leading-6" />
        </div>

        <div className="sticky bottom-3 z-10 flex justify-end">
          <SubmitButton pendingText="Salvando…" className="p-btn shadow-lg">Salvar ficha e termo</SubmitButton>
        </div>
      </ActionForm>

      {customized && (
        <ActionForm action={saveAnamnesisModel} className="p-card p-5 flex flex-wrap items-center gap-3">
          <input type="hidden" name="reset" value="1" />
          <p className="text-sm text-[#6B5A4B] flex-1 min-w-60">Voltar às perguntas e ao termo originais. As respostas das clientes não são apagadas.</p>
          {confirmReset ? (
            <span className="flex gap-2">
              <button type="button" onClick={() => setConfirmReset(false)} className="p-btn-ghost p-btn-sm">Cancelar</button>
              <SubmitButton className="p-btn p-btn-sm !bg-[#9B2C2C]" pendingText="Restaurando…">Confirmar</SubmitButton>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmReset(true)} className="p-btn-ghost p-btn-sm"><RotateCcw size={13} /> Restaurar modelo original</button>
          )}
        </ActionForm>
      )}
    </div>
  );
}
