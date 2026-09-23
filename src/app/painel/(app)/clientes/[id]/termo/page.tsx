import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { fmtDate, formatPhone, todaySP } from "@/lib/format";
import PrintButton from "@/components/painel/PrintButton";
import type { ClientRow } from "@/lib/types";

export const metadata = { title: "Ficha e termo" };

const yes = (v?: boolean) => (v ? "Sim" : "Não");

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-[#EDE3E0] py-1.5 grid grid-cols-[180px_1fr] gap-3 text-[13px]">
      <span className="text-[#8F7479]">{label}</span>
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
  const a = c.anamnesis ?? {};

  return (
    <>
      <div className="no-print flex items-center justify-between mb-5">
        <Link href={`/painel/clientes/${c.id}?tab=anamnese`} className="inline-flex items-center gap-1 text-sm text-[#8F7479] hover:text-[#8B3A42]">
          <ArrowLeft size={14} /> Voltar à ficha
        </Link>
        <PrintButton />
      </div>

      <article className="print-sheet p-card max-w-[800px] mx-auto p-10 bg-white text-[#2C1A1E]">
        <header className="text-center border-b-2 border-[#C9973A] pb-4 mb-6">
          <p className="p-display text-3xl">{settings.clinic_name}</p>
          <p className="text-xs text-[#8F7479] mt-1">{settings.address} · WhatsApp {formatPhone(settings.whatsapp.slice(-11))}</p>
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

        <section className="mb-6">
          <h2 className="p-eyebrow mb-2">Avaliação</h2>
          <Row label="Fototipo" value={a.fitzpatrick} />
          <Row label="Tipo de pele" value={a.skin_type} />
          <Row label="Queixas" value={a.concerns?.join(", ")} />
          <Row label="Condições de saúde" value={a.conditions?.join(", ")} />
          <Row label="Medicamentos" value={a.medications} />
          <Row label="Alergias" value={a.allergies_detail ?? c.allergies} />
          <Row label="Gestante / amamentando" value={`${yes(a.pregnant)} / ${yes(a.breastfeeding)}`} />
          <Row label="Usa ácidos / retinoides" value={yes(a.uses_acids)} />
          <Row label="Protetor solar / fumante" value={`${yes(a.sunscreen)} / ${yes(a.smoker)}`} />
          <Row label="Exposição solar" value={a.sun_exposure} />
          <Row label="Procedimentos anteriores" value={a.previous_procedures} />
          <Row label="Objetivos" value={a.goals} />
        </section>

        <section className="mb-8 text-[13px] leading-6 text-justify">
          <h2 className="p-eyebrow mb-2">Termo de consentimento</h2>
          <p className="mb-2">
            Declaro que as informações acima são verdadeiras e que fui informada sobre os procedimentos estéticos a serem realizados,
            seus objetivos, cuidados pré e pós-procedimento, possíveis reações e contraindicações. Comprometo-me a informar qualquer
            alteração no meu estado de saúde e a seguir as orientações recebidas.
          </p>
          <p className="mb-2">
            Estou ciente de que os resultados variam de pessoa para pessoa e dependem da continuidade do tratamento e dos cuidados em casa.
          </p>
          <p>
            Autorizo o registro fotográfico para acompanhamento da evolução do tratamento, com armazenamento sigiloso, conforme a
            Lei Geral de Proteção de Dados (Lei nº 13.709/2018). O uso das imagens em divulgação depende de autorização específica:
            ( ) autorizo &nbsp; ( ) não autorizo.
          </p>
        </section>

        <footer className="grid grid-cols-2 gap-10 mt-14 text-center text-[12px]">
          <div><div className="border-t border-[#2C1A1E] pt-1">{c.name}</div></div>
          <div><div className="border-t border-[#2C1A1E] pt-1">Profissional responsável</div></div>
          <p className="col-span-2 text-[#8F7479]">São Paulo, {fmtDate(todaySP(), { month: "long" })}</p>
        </footer>
      </article>
    </>
  );
}
