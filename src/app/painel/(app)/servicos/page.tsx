import { Plus } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { listServices } from "@/lib/queries";
import ActionForm from "@/components/painel/ActionForm";
import SubmitButton from "@/components/painel/SubmitButton";
import { Badge, PageHeader } from "@/components/painel/ui";
import { saveService } from "../../actions";
import type { ServiceRow } from "@/lib/types";

export const metadata = { title: "Serviços" };

const CATEGORIES = { facial: "Facial", corporal: "Corporal", terapias: "Terapias", combo: "Combo / Promoção" };

function ServiceForm({ service }: { service?: ServiceRow }) {
  const s = service;
  return (
    <ActionForm action={saveService} resetOnSuccess={!s} className="grid sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="lg:col-span-4">
        <span className="p-label">Nome</span>
        <input name="name" required defaultValue={s?.name} className="p-input" />
      </label>
      <label className="lg:col-span-2">
        <span className="p-label">Categoria</span>
        <select name="category" defaultValue={s?.category ?? "facial"} className="p-input">
          {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="p-label">Preço (R$)</span>
        <input name="price" required inputMode="decimal" defaultValue={s ? String(s.price).replace(".", ",") : ""} placeholder="0,00" className="p-input p-num" />
      </label>
      <label className="lg:col-span-1">
        <span className="p-label">Minutos</span>
        <input name="duration_min" type="number" required min={15} max={480} step={5} defaultValue={s?.duration_min ?? 60} className="p-input p-num" />
      </label>
      <label className="lg:col-span-1">
        <span className="p-label" title="Em quantos dias a cliente deveria voltar">Retorno</span>
        <input name="return_days" type="number" min={1} max={365} defaultValue={s?.return_days ?? ""} placeholder="dias" className="p-input p-num" />
      </label>
      <label className="lg:col-span-2 flex items-center gap-2 text-sm text-text-secondary pb-2">
        <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="accent-[#82590F]" />
        Disponível no site
      </label>
      <label className="sm:col-span-2 lg:col-span-10">
        <span className="p-label">Descrição (aparece no agendamento do site)</span>
        <input name="description" defaultValue={s?.description ?? ""} className="p-input" />
      </label>
      <div className="lg:col-span-2">
        <SubmitButton className="p-btn w-full">{s ? "Salvar" : "Criar serviço"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function ServicesPage() {
  const { supabase } = await requireStaff();
  const services = await listServices(supabase);
  const noPrice = services.filter((s) => s.active && Number(s.price) === 0);

  return (
    <>
      <PageHeader
        title="Serviços"
        subtitle="Preço, duração e retorno sugerido de cada tratamento. A duração define os horários livres no site."
      />

      {noPrice.length > 0 && (
        <p className="mb-5 rounded-xl px-4 py-3 text-sm" style={{ background: "#FFF6DD", border: "1px solid #EED9A0", color: "#5C4010" }}>
          <strong>Defina os preços:</strong> {noPrice.map((s) => s.name).join(", ")} ainda {noPrice.length > 1 ? "estão" : "está"} com valor R$ 0,00.
          No site, o valor aparece como “a combinar” até você preencher.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {services.map((s) => (
          <section key={s.id} className="p-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xl text-bronze-900">{s.name}</h2>
              {!s.active && <Badge>Inativo</Badge>}
            </div>
            <ServiceForm service={s} />
          </section>
        ))}

        <details className="p-card">
          <summary className="flex items-center gap-2 px-5 py-3.5 text-bronze-900">
            <Plus size={16} /> <span className="text-lg" style={{ fontFamily: "var(--font-cormorant), serif" }}>Novo serviço</span>
          </summary>
          <div className="px-5 pb-5"><ServiceForm /></div>
        </details>
      </div>
    </>
  );
}
