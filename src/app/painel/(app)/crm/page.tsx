import Link from "next/link";
import { Cake, Check, MessageCircle, Megaphone, Send } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { clientsWithStats, type ClientWithStats } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { fillTemplate, firstName, fmtDate, INTERACTION_LABEL, nowMs, SOURCE_LABEL, STAGE_LABEL, todaySP, whatsappLink } from "@/lib/format";
import StageSelect from "@/components/painel/StageSelect";
import SubmitButton from "@/components/painel/SubmitButton";
import { Avatar, Badge, Card, Chips, EmptyState, PageHeader, StatTile, Tabs } from "@/components/painel/ui";
import { completeInteraction, logContact } from "../../actions";
import type { ClientStage, InteractionRow, TemplateKey } from "@/lib/types";

export const metadata = { title: "CRM" };

const COLUMNS: { stage: ClientStage; hint: string; color: string }[] = [
  { stage: "lead", hint: "Pediram informação ou agendaram pelo site", color: "#D4A73C" },
  { stage: "em_contato", hint: "Conversa em andamento / 1º horário", color: "#5B6FC9" },
  { stage: "cliente", hint: "Já foram atendidas", color: "#3F9A5E" },
  { stage: "vip", hint: "Frequentes ou de alto valor", color: "#8E4BA0" },
  { stage: "inativa", hint: "Pararam de vir", color: "#B8AFA2" },
];

const SEGMENTS = {
  aniversariantes: { label: "Aniversariantes do mês", template: "aniversario" },
  retorno: { label: "Retorno vencendo", template: "retorno" },
  inativas: { label: "Inativos", template: "reativacao" },
  leads: { label: "Leads sem atendimento", template: "retorno" },
  vip: { label: "VIPs", template: "retorno" },
  todas: { label: "Todas (com permissão)", template: "retorno" },
} as const satisfies Record<string, { label: string; template: TemplateKey }>;
type Segment = keyof typeof SEGMENTS;

const TEMPLATE_LABEL: Record<TemplateKey, string> = {
  confirmacao: "Confirmação", lembrete: "Lembrete", pos_atendimento: "Pós-atendimento",
  retorno: "Retorno", reativacao: "Reativação", aniversario: "Aniversário",
};

type OpenTask = InteractionRow & { clients: { id: string; name: string; phone: string | null } | null };

function segmentFilter(seg: Segment, month: string) {
  return (c: ClientWithStats) => {
    if (seg === "aniversariantes") return c.birth_date?.slice(5, 7) === month;
    if (seg === "retorno") return c.recurrence.status === "atrasada" || c.recurrence.status === "proxima";
    if (seg === "inativas") return c.recurrence.status === "inativa" || c.stage === "inativa";
    if (seg === "leads") return (c.stage === "lead" || c.stage === "em_contato") && !Number(c.stats?.visits);
    if (seg === "vip") return c.stage === "vip";
    return true;
  };
}

export default async function CrmPage({ searchParams }: PageProps<"/painel/crm">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const month = today.slice(5, 7);
  const tab = ["funil", "tarefas", "campanhas"].includes(String(sp.tab)) ? String(sp.tab) : "funil";
  const segment: Segment = typeof sp.seg === "string" && sp.seg in SEGMENTS ? (sp.seg as Segment) : "aniversariantes";
  const tag = typeof sp.tag === "string" ? sp.tag : "";

  const [clients, tasksRes, lastRes, settings] = await Promise.all([
    clientsWithStats(supabase, today),
    supabase.from("interactions").select("*, clients(id, name, phone)").is("done_at", null).not("due_on", "is", null).order("due_on").limit(100),
    supabase.from("interactions").select("client_id, created_at, kind").order("created_at", { ascending: false }).limit(3000),
    getSettings(supabase),
  ]);
  const tasks = (tasksRes.data ?? []) as OpenTask[];
  const lastContact = new Map<string, string>();
  const recentWhats = new Set<string>();
  const weekAgo = nowMs() - 7 * 86_400_000;
  for (const i of lastRes.data ?? []) {
    if (!lastContact.has(i.client_id)) lastContact.set(i.client_id, i.created_at);
    if (i.kind === "whatsapp" && Date.parse(i.created_at) > weekAgo) recentWhats.add(i.client_id);
  }

  const monthPrefix = today.slice(0, 7);
  const leadsMonth = clients.filter((c) => c.created_at.startsWith(monthPrefix));
  const converted = leadsMonth.filter((c) => Number(c.stats?.visits) > 0).length;
  const overdue = tasks.filter((t) => t.due_on! < today).length;
  const birthdays = clients.filter((c) => c.birth_date?.slice(5, 7) === month);
  const allTags = [...new Set(clients.flatMap((c) => c.tags))].sort();

  const audience = clients
    .filter((c) => c.marketing_opt_in && c.phone)
    .filter(tag ? (c) => c.tags.includes(tag) : segmentFilter(segment, month))
    .sort((a, b) => (segment === "aniversariantes" ? (a.birth_date ?? "").slice(8).localeCompare((b.birth_date ?? "").slice(8)) : a.name.localeCompare(b.name)));
  const templateKey: TemplateKey = typeof sp.modelo === "string" && sp.modelo in settings.templates ? (sp.modelo as TemplateKey) : SEGMENTS[segment].template;
  const customMsg = typeof sp.msg === "string" && sp.msg.trim() ? sp.msg.trim().slice(0, 1000) : null;
  const message = customMsg ?? settings.templates[templateKey];
  const sentCount = audience.filter((c) => recentWhats.has(c.id)).length;

  const tabHref = (t: string) => (t === "funil" ? "/painel/crm" : `/painel/crm?tab=${t}`);
  const segHref = (s: string) => `/painel/crm?tab=campanhas&seg=${s}`;

  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="CRM & Campanhas" subtitle="Funil de clientes, tarefas de acompanhamento e mensagens em massa pelo WhatsApp." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Novos contatos no mês" value={leadsMonth.length} />
        <StatTile label="Conversão no mês" value={leadsMonth.length ? `${Math.round((converted / leadsMonth.length) * 100)}%` : "—"} hint={`${converted} já atendidas`} />
        <StatTile label="Tarefas abertas" value={tasks.length} tone={overdue ? "warn" : "default"} hint={overdue ? `${overdue} atrasadas` : "em dia"} href="/painel/crm?tab=tarefas" />
        <StatTile label="Aniversariantes do mês" value={birthdays.length} icon={Cake} href={segHref("aniversariantes")} />
      </div>

      <Tabs
        current={tab}
        tabs={[
          { key: "funil", label: "Funil", href: tabHref("funil") },
          { key: "tarefas", label: `Tarefas · ${tasks.length}`, href: tabHref("tarefas") },
          { key: "campanhas", label: "Campanhas", href: tabHref("campanhas") },
        ]}
      />

      {tab === "funil" && (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3">
            {COLUMNS.map((col) => {
              const list = clients
                .filter((c) => c.stage === col.stage)
                .sort((a, b) => (lastContact.get(b.id) ?? b.created_at).localeCompare(lastContact.get(a.id) ?? a.created_at));
              return (
                <section key={col.stage} className="rounded-2xl p-2.5 flex flex-col" style={{ background: "rgba(255,255,255,.55)", border: "1px solid #EEE5D8" }} aria-label={STAGE_LABEL[col.stage]}>
                  <header className="px-1.5 pt-1 pb-2.5" style={{ borderTop: `3px solid ${col.color}`, marginTop: -10, paddingTop: 12 }}>
                    <h2 className="flex items-center gap-2 p-display text-xl text-[#2B221B]">
                      {STAGE_LABEL[col.stage]} <span className="text-sm text-[#857566] font-sans">{list.length}</span>
                    </h2>
                    <p className="text-[11px] text-[#857566] leading-4">{col.hint}</p>
                  </header>
                  <div className="flex flex-col gap-2 max-h-[62vh] overflow-y-auto">
                    {list.length === 0 && <p className="text-xs text-[#A69885] text-center py-4">Vazio</p>}
                    {list.map((c) => {
                      const last = lastContact.get(c.id);
                      return (
                        <article key={c.id} className="rounded-xl bg-white border border-[#F0E8DB] p-3 shadow-[0_1px_2px_rgba(43,34,27,.04)]">
                          <Link href={`/painel/clientes/${c.id}`} className="flex items-center gap-2 mb-1.5 group">
                            <Avatar name={c.name} size={26} />
                            <span className="text-sm font-bold text-[#2B221B] truncate group-hover:text-[#6B4A10]">{c.name}</span>
                          </Link>
                          <p className="text-[11px] text-[#857566]">{SOURCE_LABEL[c.source]} · {Number(c.stats?.visits ?? 0)} visitas</p>
                          <p className="text-[11px] text-[#857566] mb-2">{last ? `Último contato ${fmtDate(last, { year: undefined })}` : `Cadastro ${fmtDate(c.created_at, { year: undefined })}`}</p>
                          <StageSelect id={c.id} stage={c.stage} name={c.name} />
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {tab === "tarefas" && (
        <Card title="Tarefas e follow-ups" eyebrow="Crie lembretes na ficha da cliente → Relacionamento" bodyClassName="p-3">
          {tasks.length === 0 ? <EmptyState icon={Check}>Nenhuma tarefa aberta.</EmptyState> : (
            <ul className="flex flex-col gap-2">
              {tasks.map((t) => {
                const wa = whatsappLink(t.clients?.phone, `Oi, ${firstName(t.clients?.name ?? "")}! Aqui é da ${settings.clinic_name} 🌸`);
                return (
                  <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[#F0E8DB] bg-white px-3 py-2.5">
                    <Badge tone={t.due_on! < today ? "red" : t.due_on === today ? "gold" : "gray"}>{t.due_on === today ? "Hoje" : fmtDate(t.due_on, { year: undefined })}</Badge>
                    <div className="flex-1 min-w-0">
                      <Link href={`/painel/clientes/${t.clients?.id}?tab=relacionamento`} className="text-sm font-bold text-[#2B221B] hover:underline">{t.clients?.name}</Link>
                      <p className="text-xs text-[#857566] line-clamp-2"><strong>{INTERACTION_LABEL[t.kind]}:</strong> {t.content}</p>
                    </div>
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm" aria-label="WhatsApp"><MessageCircle size={13} /></a>}
                    <form action={completeInteraction}>
                      <input type="hidden" name="id" value={t.id} />
                      <SubmitButton className="p-btn-ghost p-btn-sm"><Check size={12} /> Feito</SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === "campanhas" && (
        <div className="grid xl:grid-cols-[340px_1fr] gap-5">
          <div className="flex flex-col gap-5">
            <Card title="Público" eyebrow="1. Escolha o segmento" bodyClassName="p-4">
              <div className="flex flex-col gap-1.5">
                {(Object.keys(SEGMENTS) as Segment[]).map((s) => (
                  <Link key={s} href={segHref(s)} className="p-chip justify-between" aria-current={!tag && s === segment ? "true" : undefined}>
                    {SEGMENTS[s].label}
                    <span className="p-num text-xs opacity-70">{clients.filter((c) => c.marketing_opt_in && c.phone).filter(segmentFilter(s, month)).length}</span>
                  </Link>
                ))}
              </div>
              {allTags.length > 0 && (
                <>
                  <p className="p-label mt-4">Por etiqueta</p>
                  <Chips current={tag} items={allTags.map((t) => ({ key: t, label: t, href: `/painel/crm?tab=campanhas&tag=${encodeURIComponent(t)}` }))} />
                </>
              )}
            </Card>
            <Card title="Mensagem" eyebrow="2. Personalize" bodyClassName="p-4">
              <form action="/painel/crm" className="flex flex-col gap-3">
                <input type="hidden" name="tab" value="campanhas" />
                {tag ? <input type="hidden" name="tag" value={tag} /> : <input type="hidden" name="seg" value={segment} />}
                <label>
                  <span className="p-label">Modelo</span>
                  <select name="modelo" defaultValue={templateKey} className="p-input">
                    {(Object.keys(TEMPLATE_LABEL) as TemplateKey[]).map((k) => <option key={k} value={k}>{TEMPLATE_LABEL[k]}</option>)}
                  </select>
                </label>
                <label>
                  <span className="p-label">Ou escreva uma mensagem própria</span>
                  <textarea name="msg" rows={4} defaultValue={customMsg ?? ""} placeholder="Use {nome} para personalizar. Ex.: {nome}, esta semana a limpeza de pele está com 15% off!" className="p-input resize-y" />
                </label>
                <button className="p-btn-ghost">Aplicar</button>
              </form>
            </Card>
          </div>

          <Card
            title={tag ? `Etiqueta: ${tag}` : SEGMENTS[segment].label}
            eyebrow={`3. Envie · ${audience.length} clientes · ${sentCount} contatadas nos últimos 7 dias`}
            action={<Megaphone size={18} className="text-[#C9973A]" />}
            bodyClassName="p-3"
          >
            <p className="text-xs text-[#857566] px-2 pb-3">
              Clique em “Enviar” para abrir o WhatsApp com a mensagem pronta e depois em “Registrar” para marcar no histórico. Só aparecem clientes que aceitam mensagens (LGPD).
            </p>
            {audience.length === 0 ? <EmptyState icon={Send}>Ninguém neste segmento.</EmptyState> : (
              <ul className="flex flex-col gap-2">
                {audience.map((c) => {
                  const text = fillTemplate(message, { nome: firstName(c.name), clinica: settings.clinic_name, servico: "tratamento" });
                  const done = recentWhats.has(c.id);
                  return (
                    <li key={c.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${done ? "bg-[#F4FAF6] border-[#CFE7D7]" : "bg-white border-[#F0E8DB]"}`}>
                      <Avatar name={c.name} size={30} />
                      <div className="flex-1 min-w-0">
                        <Link href={`/painel/clientes/${c.id}`} className="text-sm text-[#2B221B] hover:underline">{c.name}</Link>
                        <p className="text-[11px] text-[#857566] truncate">
                          {segment === "aniversariantes" && c.birth_date ? `🎂 dia ${c.birth_date.slice(8)}` : `${Number(c.stats?.visits ?? 0)} visitas`}
                          {done && " · contatada nesta semana"}
                        </p>
                      </div>
                      <a href={whatsappLink(c.phone, text) ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn p-btn-sm"><Send size={12} /> Enviar</a>
                      <form action={logContact}>
                        <input type="hidden" name="client_id" value={c.id} />
                        <input type="hidden" name="content" value={`Campanha (${tag ? `etiqueta ${tag}` : SEGMENTS[segment].label}): ${text.slice(0, 300)}`} />
                        <SubmitButton className="p-btn-ghost p-btn-sm">Registrar</SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
