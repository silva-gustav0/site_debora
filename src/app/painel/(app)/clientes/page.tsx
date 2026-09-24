import Link from "next/link";
import { Download, Search, UserPlus, Users } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { clientsWithStats } from "@/lib/queries";
import { brl, digits, fmtDate, formatPhone, STAGE_LABEL, todaySP } from "@/lib/format";
import { RECURRENCE_META } from "@/lib/recurrence";
import ClientForm from "@/components/painel/ClientForm";
import Drawer from "@/components/painel/Drawer";
import { Avatar, Badge, Card, Chips, EmptyState, PageHeader, StageBadge, StatTile } from "@/components/painel/ui";
import type { ClientStage } from "@/lib/types";

export const metadata = { title: "Clientes" };

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const SORTS = { nome: "Nome", recentes: "Cadastro recente", visitas: "Mais visitas", valor: "Maior valor", ultima: "Última visita" } as const;

export default async function ClientsPage({ searchParams }: PageProps<"/painel/clientes">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const stage = typeof sp.etapa === "string" && sp.etapa in STAGE_LABEL ? (sp.etapa as ClientStage) : null;
  const sort = typeof sp.ordem === "string" && sp.ordem in SORTS ? (sp.ordem as keyof typeof SORTS) : "nome";

  const all = await clientsWithStats(supabase, today);
  const nq = normalize(q);
  const dq = digits(q);
  const list = all
    .filter((c) => {
      if (stage && c.stage !== stage) return false;
      if (!q) return true;
      return normalize(c.name).includes(nq) || (c.email ?? "").includes(nq) || (dq.length >= 3 && (c.phone ?? "").includes(dq)) || c.tags.some((t) => normalize(t).includes(nq));
    })
    .sort((a, b) => {
      if (sort === "recentes") return b.created_at.localeCompare(a.created_at);
      if (sort === "visitas") return Number(b.stats?.visits ?? 0) - Number(a.stats?.visits ?? 0);
      if (sort === "valor") return Number(b.stats?.total_spent ?? 0) - Number(a.stats?.total_spent ?? 0);
      if (sort === "ultima") return (b.stats?.last_visit ?? "").localeCompare(a.stats?.last_visit ?? "");
      return a.name.localeCompare(b.name, "pt-BR");
    });

  const counts = all.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.stage]: (acc[c.stage] ?? 0) + 1 }), {});
  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur = { q: q || null, etapa: stage, ordem: sort === "nome" ? null : sort, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return `/painel/clientes${s ? `?${s}` : ""}`;
  };
  const withVisits = all.filter((c) => Number(c.stats?.visits) > 0);
  const ltv = withVisits.length ? withVisits.reduce((s, c) => s + Number(c.stats?.total_spent ?? 0), 0) / withVisits.length : 0;
  const newMonth = all.filter((c) => c.created_at.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Clientes"
        subtitle="Cadastro, prontuário e histórico de cada cliente."
        actions={
          <>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- download de CSV, não é navegação */}
            <a href="/painel/clientes/exportar" className="p-btn-ghost"><Download size={14} /> Exportar CSV</a>
            <Link href={href({ nova: "1" })} scroll={false} className="p-btn"><UserPlus size={14} /> Nova cliente</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Cadastrados" value={all.length} icon={Users} />
        <StatTile label="Já atendidas" value={withVisits.length} hint={all.length ? `${Math.round((withVisits.length / all.length) * 100)}% da base` : undefined} />
        <StatTile label="Valor médio por cliente" value={brl(ltv)} hint="total investido (LTV)" />
        <StatTile label="Novos no mês" value={newMonth} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <form className="relative flex-1 max-w-md" action="/painel/clientes">
          {stage && <input type="hidden" name="etapa" value={stage} />}
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A69885]" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="Nome, telefone, e-mail ou etiqueta" className="p-input pl-9" aria-label="Buscar clientes" />
        </form>
        <Chips
          current={stage ?? "todas"}
          items={[
            { key: "todas", label: `Todas · ${all.length}`, href: href({ etapa: null }) },
            ...Object.entries(STAGE_LABEL).map(([v, l]) => ({ key: v, label: `${l} · ${counts[v] ?? 0}`, href: href({ etapa: v }) })),
          ]}
        />
      </div>

      <Card bodyClassName="overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F5EEE3] text-xs text-[#857566]">
          <span>{list.length} {list.length === 1 ? "cliente" : "clientes"}</span>
          <span className="flex items-center gap-2">
            Ordenar:
            {Object.entries(SORTS).map(([k, l]) => (
              <Link key={k} href={href({ ordem: k === "nome" ? null : k })} className={k === sort ? "font-bold text-[#2B221B]" : "hover:text-[#6B4A10]"}>{l}</Link>
            ))}
          </span>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={Users}>{all.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."}</EmptyState>
        ) : (
          <table className="p-table">
            <thead>
              <tr><th>Cliente</th><th>WhatsApp</th><th>Etapa</th><th className="text-right">Visitas</th><th>Última visita</th><th className="text-right">Investido</th><th>Retorno</th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-3 group">
                      <Avatar name={c.name} size={34} />
                      <span>
                        <span className="block font-bold text-[#2B221B] group-hover:text-[#6B4A10]">{c.name}</span>
                        {c.tags.length > 0 && <span className="flex flex-wrap gap-1 mt-0.5">{c.tags.slice(0, 3).map((t) => <Badge key={t} tone="bronze">{t}</Badge>)}</span>}
                      </span>
                    </Link>
                  </td>
                  <td className="p-num whitespace-nowrap">{formatPhone(c.phone) || "—"}</td>
                  <td><StageBadge stage={c.stage} /></td>
                  <td className="text-right p-num">{c.stats?.visits ?? 0}</td>
                  <td className="whitespace-nowrap">{fmtDate(c.stats?.last_visit)}</td>
                  <td className="text-right p-num whitespace-nowrap">{brl(c.stats?.total_spent)}</td>
                  <td><Badge tone={RECURRENCE_META[c.recurrence.status].tone}>{RECURRENCE_META[c.recurrence.status].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {sp.nova === "1" && (
        <Drawer title="Nova cliente" eyebrow="Cadastro" closeHref={href({})}>
          <ClientForm />
        </Drawer>
      )}
    </>
  );
}
