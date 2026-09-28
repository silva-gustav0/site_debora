import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { fmtDate, formatPhone, todaySP } from "@/lib/format";
import PrintButton from "@/components/painel/PrintButton";
import type { ClientRow } from "@/lib/types";
import { formOrDefault, consentOrDefault, allQuestions, formatAnswer, fillConsent, RESERVED_KEYS, DEFAULT_ANAMNESIS_FORM } from "@/lib/anamnesis-schema";

export const metadata = { title: "Ficha e termo" };

/** Verdadeiro se o valor não tem nada útil pra mostrar. */
const isEmptyValue = (v: unknown) =>
  v === undefined || v === null || v === "" || v === false || (Array.isArray(v) && v.length === 0);

const DEFAULT_QUESTIONS = new Map(allQuestions(DEFAULT_ANAMNESIS_FORM).map((q) => [q.id, q]));

/** Rótulo de uma resposta antiga (sem pergunta no modelo atual): o da ficha original, ou a chave legível. */
const readableLabel = (key: string) => {
  const known = DEFAULT_QUESTIONS.get(key)?.label;
  if (known) return known;
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-[#ECE4D8] py-1.5 grid grid-cols-[180px_1fr] gap-3 text-[13px]">
      <span className="text-[#857566]">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

export default async function ConsentPage({ params }: PageProps<"/painel/clientes/[id]/termo">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireStaff();
  const [{ data }, settings] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    getSettings(supabase),
  ]);
  const c = data as ClientRow | null;
  if (!c) notFound();
  const a = (c.anamnesis ?? {}) as Record<string, unknown>;

  const form = formOrDefault(settings.anamnesis_form);
  const knownIds = new Set(allQuestions(form).map((q) => q.id));
  const extraAnswers = Object.entries(a).filter(([k, v]) => !RESERVED_KEYS.has(k) && !knownIds.has(k) && !isEmptyValue(v));

  const consentParagraphs = fillConsent(consentOrDefault(settings.consent_text), { clinica: settings.clinic_name, nome: c.name })
    .split(/\n\s*\n/);

  return (
    <>
      <div className="no-print flex items-center justify-between mb-5">
        <Link href={`/painel/clientes/${c.id}?tab=anamnese`} className="inline-flex items-center gap-1 text-sm text-[#857566] hover:text-[#6B4A10]">
          <ArrowLeft size={14} /> Voltar à ficha
        </Link>
        <PrintButton />
      </div>

      <article className="print-sheet p-card max-w-[800px] mx-auto p-10 bg-white text-[#2B221B]">
        <header className="text-center border-b-2 border-[#C9973A] pb-4 mb-6">
          <p className="p-display text-3xl">{settings.clinic_name}</p>
          <p className="text-xs text-[#857566] mt-1">{settings.address} · WhatsApp {formatPhone(settings.whatsapp.slice(-11))}</p>
          <h1 className="p-display text-2xl mt-4">Ficha de Anamnese e Termo de Consentimento</h1>
        </header>

        <section className="mb-6">
          <h2 className="p-eyebrow mb-2">Identificação</h2>
          <Row label="Nome" value={c.name} />
          <Row label="Nascimento" value={c.birth_date ? fmtDate(c.birth_date) : null} />
          <Row label="CPF" value={c.cpf} />
          <Row label="Telefone" value={formatPhone(c.phone)} />
          <Row label="E-mail" value={c.email} />
          <Row label="Endereço" value={c.address} />
          <Row label="Profissão" value={c.occupation} />
        </section>

        {form.sections.map((section) => (
          <section key={section.id} className="mb-6">
            <h2 className="p-eyebrow mb-2">{section.title}</h2>
            {section.questions.map((q) => (
              <Row
                key={q.id}
                label={q.label}
                value={q.id === "allergies_detail" ? formatAnswer(q, a[q.id]) || c.allergies : formatAnswer(q, a[q.id])}
              />
            ))}
          </section>
        ))}

        {extraAnswers.length > 0 && (
          <section className="mb-6">
            <h2 className="p-eyebrow mb-2">Respostas anteriores</h2>
            {extraAnswers.map(([k, v]) => (
              <Row key={k} label={readableLabel(k)} value={formatAnswer(DEFAULT_QUESTIONS.get(k) ?? { type: typeof v === "boolean" ? "yes_no" : "text" }, v)} />
            ))}
          </section>
        )}

        <section className="mb-8 text-[13px] leading-6 text-justify">
          <h2 className="p-eyebrow mb-2">Termo de consentimento</h2>
          {consentParagraphs.map((paragraph, i) => (
            <p key={i} className="mb-2 whitespace-pre-line">{paragraph}</p>
          ))}
        </section>

        <footer className="grid grid-cols-2 gap-10 mt-14 text-center text-[12px]">
          <div><div className="border-t border-[#2B221B] pt-1">{c.name}</div></div>
          <div><div className="border-t border-[#2B221B] pt-1">Profissional responsável</div></div>
          <p className="col-span-2 text-[#857566]">São Paulo, {fmtDate(todaySP(), { month: "long" })}</p>
        </footer>
      </article>
    </>
  );
}
