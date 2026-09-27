import { saveCustomSection } from "@/app/painel/site-actions";
import { BUILTIN_SECTIONS, IMAGE_POSITIONS, SECTION_BGS, type CustomSection } from "@/lib/site-content";
import ActionForm from "./ActionForm";
import ImageField from "./ImageField";
import SubmitButton from "./SubmitButton";

const Select = ({ name, label, options, value }: { name: string; label: string; options: Record<string, string>; value: string }) => (
  <label>
    <span className="p-label">{label}</span>
    <select name={name} defaultValue={value} className="p-input">
      {Object.entries(options).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

/** Formulário de uma seção criada no painel (nova quando `s` não é informado). */
export default function CustomSectionForm({ s }: { s?: CustomSection }) {
  const after = Object.fromEntries(Object.entries(BUILTIN_SECTIONS).map(([k, l]) => [k, `Depois de “${l}”`]));
  return (
    <ActionForm action={saveCustomSection} resetOnSuccess={!s} className="grid gap-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid lg:grid-cols-[1fr_auto] gap-5">
        <div className="grid sm:grid-cols-2 gap-3 content-start">
          <label className="sm:col-span-2">
            <span className="p-label">Texto pequeno acima do título</span>
            <input name="eyebrow" defaultValue={s?.eyebrow} maxLength={120} placeholder="Nossa Equipe" className="p-input" />
          </label>
          <label>
            <span className="p-label">Título</span>
            <input name="title" defaultValue={s?.title} maxLength={200} placeholder="Conheça a" className="p-input" />
          </label>
          <label>
            <span className="p-label">Título (parte destacada em dourado)</span>
            <input name="title_highlight" defaultValue={s?.title_highlight} maxLength={200} placeholder="Nossa História" className="p-input" />
          </label>
          <label className="sm:col-span-2">
            <span className="p-label">Texto</span>
            <textarea name="text" defaultValue={s?.text} rows={6} maxLength={8000} className="p-input resize-y" />
            <span className="block text-[11px] text-[#A69885] mt-1">Cada linha vira um parágrafo.</span>
          </label>
          <Select name="image_position" label="Posição da foto" options={IMAGE_POSITIONS} value={s?.image_position ?? "left"} />
          <Select name="after" label="Onde aparece no site" options={after} value={s?.after ?? "about"} />
          <Select name="bg" label="Cor de fundo" options={SECTION_BGS} value={s?.bg ?? "cream"} />
          <label>
            <span className="p-label">Nome no menu (opcional)</span>
            <input name="menu_label" defaultValue={s?.menu_label} maxLength={30} placeholder="Deixe vazio para não aparecer" className="p-input" />
          </label>
        </div>
        <ImageField name="image" label="Foto" defaultValue={s?.image ?? ""} folder="secoes" />
      </div>
      <div><SubmitButton pendingText="Salvando…">{s ? "Salvar seção" : "Criar seção"}</SubmitButton></div>
    </ActionForm>
  );
}
