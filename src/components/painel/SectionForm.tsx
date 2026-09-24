import { RotateCcw } from "lucide-react";
import { resetSection, saveSection } from "@/app/painel/site-actions";
import { DEFAULT_CONTENT, SECTION_FIELDS, type SectionKey, type SiteContent } from "@/lib/site-content";
import ActionForm from "./ActionForm";
import ConfirmButton from "./ConfirmButton";
import ImageField from "./ImageField";
import SubmitButton from "./SubmitButton";
import { Card } from "./ui";

const FOLDER: Partial<Record<SectionKey, string>> = { brand: "marca", hero: "inicio", about: "sobre" };

/** Formulário de uma seção do site, montado a partir de SECTION_FIELDS. */
export default function SectionForm<S extends SectionKey>({
  section, values, title, eyebrow, children,
}: {
  section: S;
  values: SiteContent[S];
  title: string;
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  const v = values as Record<string, unknown>;
  const defaults = DEFAULT_CONTENT[section] as Record<string, unknown>;

  return (
    <Card
      title={title}
      eyebrow={eyebrow}
      action={
        <form action={resetSection}>
          <input type="hidden" name="section" value={section} />
          <ConfirmButton confirmText="Voltar ao texto original">
            <RotateCcw size={13} /> Original
          </ConfirmButton>
        </form>
      }
    >
      {children}
      <ActionForm action={saveSection} className="grid gap-4">
        <input type="hidden" name="section" value={section} />
        {SECTION_FIELDS[section].map((f) => {
          const value = v[f.key];
          switch (f.type) {
            case "image":
              return (
                <ImageField
                  key={f.key}
                  name={f.key}
                  label={f.label}
                  hint={f.hint}
                  folder={FOLDER[section] ?? "geral"}
                  defaultValue={value === defaults[f.key] ? "" : String(value)}
                  fallback={String(defaults[f.key])}
                  aspect={section === "hero" ? "aspect-[4/5]" : section === "brand" ? "aspect-[2/1]" : "aspect-[4/3]"}
                />
              );
            case "toggle":
              return (
                <label key={f.key} className="flex items-center gap-2 text-sm text-[#4A3C30]">
                  <input type="checkbox" name={f.key} defaultChecked={Boolean(value)} className="accent-[#82590F] w-4 h-4" />
                  {f.label}
                </label>
              );
            case "items":
              return (
                <fieldset key={f.key}>
                  <legend className="p-label">{f.label}</legend>
                  {f.hint && <p className="text-[11px] text-[#A69885] -mt-0.5 mb-2">{f.hint}</p>}
                  <div className="grid md:grid-cols-3 gap-3">
                    {(value as Record<string, string>[]).map((item, i) => (
                      <div key={i} className="rounded-xl border border-[#F0E8DB] bg-[#FEFBF7] p-3 grid gap-2">
                        {f.fields.map((sf) => (
                          <label key={sf.key}>
                            <span className="p-label">{sf.label} {i + 1}</span>
                            {sf.textarea ? (
                              <textarea name={`${f.key}.${i}.${sf.key}`} defaultValue={item[sf.key]} rows={5} className="p-input resize-y" />
                            ) : (
                              <input name={`${f.key}.${i}.${sf.key}`} defaultValue={item[sf.key]} className="p-input" />
                            )}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </fieldset>
              );
            default: {
              const text = f.type === "lines" ? (value as string[]).join("\n") : String(value ?? "");
              return (
                <label key={f.key}>
                  <span className="p-label">{f.label}</span>
                  {f.type === "text" ? (
                    <input name={f.key} defaultValue={text} className="p-input" />
                  ) : (
                    <textarea name={f.key} defaultValue={text} rows={f.rows ?? 3} className="p-input resize-y" />
                  )}
                  {f.hint && <span className="block text-[11px] text-[#A69885] mt-1">{f.hint}</span>}
                </label>
              );
            }
          }
        })}
        <div><SubmitButton pendingText="Salvando…">Salvar</SubmitButton></div>
      </ActionForm>
    </Card>
  );
}
