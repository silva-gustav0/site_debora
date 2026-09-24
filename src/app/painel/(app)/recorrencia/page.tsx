import Link from "next/link";
import { MessageCircle, Repeat } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { clientsWithStats, listServices } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { fillTemplate, firstName, fmtDate, todaySP, whatsappLink } from "@/lib/format";
import { RECURRENCE_META, type RecurrenceStatus } from "@/lib/recurrence";
import SubmitButton from "@/components/painel/SubmitButton";
import { Avatar, Badge, Card, Chips, EmptyState, PageHeader, StatTile } from "@/components/painel/ui";
import { logContact } from "../../actions";

export const metadata = { title: "Recorrência" };

const FILTERS: { key: RecurrenceStatus | "todas"; label: string }[] = [
  { key: "todas", label: "Precisam de atenção" },
  { key: "atrasada", label: "Atrasados" },
  { key: "proxima", label: "Próximos 7 dias" },
  { key: "inativa", label: "Inativos" },
  { key: "agendada", label: "Já agendados" },
  { key: "em_dia", label: "Em dia" },
];

export default async function RecurrencePage({ searchParams }: PageProps<"/painel/recorrencia">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const filter = FILTERS.some((f) => f.key === sp.filtro) ? (sp.filtro as RecurrenceStatus | "todas") : "todas";

  const [clients, services, settings] = await Promise.all([clientsWithStats(supabase, today), listServices(supabase), getSettings(supabase)]);
  const serviceName = new Map(services.map((s) => [s.id, s.name]));

  const withVisits = clients.filter((c) => c.recurrence.status !== "sem_visita");
  const recurring = withVisits.filter((c) => Number(c.stats?.visits) >= 2);
  const learned = withVisits.filter((c) => c.recurrence.learned);
  const avgInterval = learned.length ? Math.round(learned.reduce((s, c) => s + c.recurrence.interval, 0) / learned.length) : null;
  const count = (s: RecurrenceStatus) => withVisits.filter((c) => c.recurrence.status === s).length;

  const list = withVisits
    .filter((c) => (filter === "todas" ? ["atrasada", "proxima", "inativa"].includes(c.recurrence.status) : c.recurrence.status === filter))
    .sort((a, b) => RECURRENCE_META[a.recurrence.status].order - RECURRENCE_META[b.recurrence.status].order || (a.recurrence.daysUntilDue ?? 0) - (b.recurrence.daysUntilDue ?? 0));

  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Recorrência" subtitle="Quem deveria estar voltando, pela frequência real de cada cliente." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="col-span-2 lg:col-span-1">
          <StatTile tone="dark" label="Taxa de retorno" value={withVisits.length ? `${Math.round((recurring.length / withVisits.length) * 100)}%` : "—"} hint={`${recurring.length} de ${withVisits.length} voltaram`} icon={Repeat} />
        </div>
        <StatTile label="Frequência média" value={avgInterval ? `${avgInterval} dias` : "—"} hint="entre visitas" />
        <StatTile label="Retorno atrasado" value={count("atrasada")} tone={count("atrasada") ? "warn" : "default"} hint={`${count("proxima")} vencem em 7 dias`} href="/painel/recorrencia?filtro=atrasada" />
        <StatTile label="Inativos" value={count("inativa")} hint="reative com campanha" href="/painel/crm?tab=campanhas&seg=inativas" />
      </div>

      <div className="mb-4">
        <Chips current={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: f.key === "todas" ? "/painel/recorrencia" : `/painel/recorrencia?filtro=${f.key}` }))} />
      </div>

      <Card bodyClassName="overflow-x-auto">
        {list.length === 0 ? <EmptyState icon={Repeat}>Nenhum cliente nesta lista. 🌿</EmptyState> : (
          <table className="p-table">
            <thead>
              <tr><th>Cliente</th><th>Situação</th><th>Último serviço</th><th>Última visita</th><th className="text-right">Frequência</th><th>Retorno previsto</th><th><span className="sr-only">Ações</span></th></tr>
            </thead>
            <tbody>
              {list.map((c) => {
                const r = c.recurrence;
                const svc = c.stats?.last_service_id ? serviceName.get(c.stats.last_service_id) : null;
                const msg = fillTemplate(settings.templates[r.status === "inativa" ? "reativacao" : "retorno"], { nome: firstName(c.name), servico: svc ?? "tratamento", clinica: settings.clinic_name });
                const wa = c.marketing_opt_in ? whatsappLink(c.phone, msg) : null;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 group">
                        <Avatar name={c.name} size={32} />
                        <span><span className="block font-bold group-hover:text-[#6B4A10]">{c.name}</span><span className="text-xs text-[#857566]">{c.stats?.visits} visitas</span></span>
                      </Link>
                    </td>
                    <td><Badge tone={RECURRENCE_META[r.status].tone}>{RECURRENCE_META[r.status].label}</Badge></td>
                    <td>{svc ?? "—"}</td>
                    <td className="whitespace-nowrap">{fmtDate(r.lastVisit)}<p className="text-xs text-[#857566]">há {r.daysSinceLast} dias</p></td>
                    <td className="text-right p-num whitespace-nowrap">{r.interval} dias<p className="text-xs text-[#857566]">{r.learned ? "média real" : "sugerida"}</p></td>
                    <td className="whitespace-nowrap">
                      {r.status === "agendada" ? fmtDate(c.stats?.next_appointment) : fmtDate(r.dueDate)}
                      {r.daysUntilDue !== null && r.status !== "agendada" && (
                        <p className={`text-xs ${r.daysUntilDue < 0 ? "text-[#9B2C2C]" : "text-[#857566]"}`}>
                          {r.daysUntilDue < 0 ? `${-r.daysUntilDue} dias de atraso` : r.daysUntilDue === 0 ? "hoje" : `em ${r.daysUntilDue} dias`}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm"><MessageCircle size={13} /> Chamar</a>
                          : <span className="text-xs text-[#A69885]" title="Sem telefone ou não aceita mensagens">—</span>}
                        <form action={logContact}>
                          <input type="hidden" name="client_id" value={c.id} />
                          <input type="hidden" name="content" value="Mensagem de retorno enviada pelo WhatsApp." />
                          <SubmitButton className="p-btn-ghost p-btn-sm" title="Registrar que foi contatada">Contatada</SubmitButton>
                        </form>
                        <Link href={`/painel/agenda?cliente=${c.id}`} className="p-btn p-btn-sm">Agendar</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-[#857566] mt-3">
        A frequência usa o intervalo médio real entre as visitas concluídas. Com menos de duas visitas, usa o retorno sugerido do serviço (ajustável em Serviços).
      </p>
    </>
  );
}
