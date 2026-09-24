import Link from "next/link";
import { ExternalLink, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { brl, fmtDate, todaySP } from "@/lib/format";
import { listServices } from "@/lib/queries";
import { getSiteContent } from "@/lib/site";
import { categoryColor, type BlogPostRow, type Promotion } from "@/lib/site-content";
import ActionForm from "@/components/painel/ActionForm";
import ConfirmButton from "@/components/painel/ConfirmButton";
import ImageField from "@/components/painel/ImageField";
import SectionForm from "@/components/painel/SectionForm";
import SubmitButton from "@/components/painel/SubmitButton";
import { Alert, Badge, Card, EmptyState, PageHeader, Tabs } from "@/components/painel/ui";
import { deletePromotion, savePromotion } from "../../site-actions";
import type { ServiceRow } from "@/lib/types";

export const metadata = { title: "Site" };

const TABS = [
  { key: "inicio", label: "Início", anchor: "inicio" },
  { key: "sobre", label: "Sobre", anchor: "sobre" },
  { key: "servicos", label: "Serviços", anchor: "servicos" },
  { key: "promocoes", label: "Promoções", anchor: "servicos" },
  { key: "blog", label: "Blog", anchor: "blog" },
  { key: "contato", label: "Contato e rodapé", anchor: "contato" },
  { key: "marca", label: "Logo e Google", anchor: "inicio" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const moneyInput = (n: number | null) => (n === null ? "" : String(n).replace(".", ","));

function promoStatus(p: Promotion, today: string) {
  if (!p.active) return <Badge>Pausada</Badge>;
  if (p.starts_on && p.starts_on > today) return <Badge tone="blue">Começa em {fmtDate(p.starts_on)}</Badge>;
  if (p.ends_on && p.ends_on < today) return <Badge tone="red">Encerrada</Badge>;
  return <Badge tone="green">No ar</Badge>;
}

function PromotionForm({ promo, services }: { promo?: Promotion; services: ServiceRow[] }) {
  const p = promo;
  return (
    <ActionForm action={savePromotion} resetOnSuccess={!p} className="grid gap-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid lg:grid-cols-[1fr_auto] gap-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 content-start">
          <label className="sm:col-span-2 lg:col-span-1">
            <span className="p-label">Etiqueta</span>
            <input name="label" defaultValue={p?.label ?? "Promoção"} placeholder="Promoção de Inauguração" className="p-input" />
          </label>
          <label className="sm:col-span-2 lg:col-span-3">
            <span className="p-label">Título</span>
            <input name="title" required defaultValue={p?.title} placeholder="Limpeza de Pele + Massagem" className="p-input" />
          </label>
          <label className="sm:col-span-2 lg:col-span-4">
            <span className="p-label">Descrição</span>
            <input name="description" defaultValue={p?.description ?? ""} placeholder="Tratamento completo a preço especial" className="p-input" />
          </label>
          <label>
            <span className="p-label">Preço (R$)</span>
            <input name="price" inputMode="decimal" defaultValue={moneyInput(p?.price ?? null)} placeholder="300,00" className="p-input p-num" />
          </label>
          <label>
            <span className="p-label" title="Aparece riscado, antes do preço">Preço “de” (R$)</span>
            <input name="old_price" inputMode="decimal" defaultValue={moneyInput(p?.old_price ?? null)} placeholder="opcional" className="p-input p-num" />
          </label>
          <label>
            <span className="p-label">Começa em</span>
            <input name="starts_on" type="date" defaultValue={p?.starts_on ?? ""} className="p-input" />
          </label>
          <label>
            <span className="p-label">Termina em</span>
            <input name="ends_on" type="date" defaultValue={p?.ends_on ?? ""} className="p-input" />
          </label>
          <label className="sm:col-span-2">
            <span className="p-label">Serviço para agendar</span>
            <select name="service_id" defaultValue={p?.service_id ?? ""} className="p-input">
              <option value="">— Só leva ao agendamento —</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inativo)"}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="p-label">Texto do botão</span>
            <input name="cta_label" defaultValue={p?.cta_label ?? "Aproveitar oferta"} className="p-input" />
          </label>
          <label>
            <span className="p-label">Ordem</span>
            <input name="sort_order" type="number" defaultValue={p?.sort_order ?? 0} className="p-input p-num" />
          </label>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#4A3C30]">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="accent-[#82590F] w-4 h-4" />
              Ativa (aparece no site)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="show_in_hero" defaultChecked={p?.show_in_hero ?? false} className="accent-[#82590F] w-4 h-4" />
              Destacar no topo da página
            </label>
          </div>
        </div>
        <ImageField name="image_url" label="Foto (opcional)" defaultValue={p?.image_url ?? ""} folder="promocoes" aspect="aspect-square" />
      </div>
      <div><SubmitButton pendingText="Salvando…">{p ? "Salvar promoção" : "Criar promoção"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function SitePage({ searchParams }: PageProps<"/painel/site">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "inicio";
  const content = await getSiteContent();
  const anchor = TABS.find((t) => t.key === tab)!.anchor;

  const [promosRes, postsRes, services] = await Promise.all([
    tab === "promocoes"
      ? supabase.from("promotions").select("*").order("sort_order").order("created_at")
      : Promise.resolve({ data: [], error: null }),
    tab === "blog"
      ? supabase.from("blog_posts").select("slug, title, category, published_on, featured, published").order("published_on", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    tab === "promocoes" ? listServices(supabase) : Promise.resolve([] as ServiceRow[]),
  ]);
  const missingTables = Boolean(promosRes.error || postsRes.error);
  const today = todaySP();

  return (
    <>
      <PageHeader
        eyebrow="Conteúdo"
        title="Site"
        subtitle="Textos, fotos, promoções e blog da página da clínica. Ao salvar, o site é atualizado na hora."
        actions={
          <a href={`/#${anchor}`} target="_blank" className="p-btn-ghost">
            <ExternalLink size={14} /> Ver no site
          </a>
        }
      />
      <Tabs current={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: `/painel/site?tab=${t.key}` }))} />

      {missingTables && (
        <div className="mb-5">
          <Alert tone="red">
            O banco ainda não tem as tabelas do site. Aplique a migração <code>20260924200000_site_content.sql</code> com <code>supabase db push</code>.
          </Alert>
        </div>
      )}

      {tab === "inicio" && (
        <SectionForm section="hero" values={content.hero} title="Topo da página" eyebrow="Primeira coisa que a cliente vê" />
      )}

      {tab === "sobre" && (
        <SectionForm section="about" values={content.about} title="Quem somos" eyebrow="Seção “Sobre”" />
      )}

      {tab === "servicos" && (
        <div className="grid gap-5">
          <Card title="Cartões de serviço" eyebrow="Quais serviços aparecem">
            <p className="text-sm text-[#6B5A4B]">
              Os cartões mostram os serviços marcados como <strong>“Mostrar na página inicial”</strong>, com nome, descrição e ícone
              cadastrados em{" "}
              <Link href="/painel/servicos" className="underline text-[#82590F]">Serviços</Link>. Lá também ficam preço e duração do agendamento.
            </p>
          </Card>
          <SectionForm section="services" values={content.services} title="Títulos da seção de serviços" />
          <SectionForm section="schedule" values={content.schedule} title="Títulos do agendamento" />
        </div>
      )}

      {tab === "promocoes" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#6B5A4B]">
            Promoções ativas aparecem como faixa abaixo dos serviços; uma delas pode ir também para o cartão do topo.
            Para a cliente agendar com o preço da promoção, crie um serviço “Combo / Promoção” em{" "}
            <Link href="/painel/servicos" className="underline text-[#82590F]">Serviços</Link> e escolha-o aqui.
          </p>
          {(promosRes.data as Promotion[] | null ?? []).map((p) => (
            <section key={p.id} className="p-card p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <h2 className="p-display text-2xl text-[#2B221B] mr-1">{p.title}</h2>
                {promoStatus(p, today)}
                {p.show_in_hero && <Badge tone="gold"><Star size={10} /> No topo</Badge>}
                {p.price !== null && <span className="text-sm text-[#857566]">{brl(p.price)}</span>}
                <form action={deletePromotion} className="ml-auto">
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmButton><Trash2 size={13} /> Excluir</ConfirmButton>
                </form>
              </div>
              <PromotionForm promo={{ ...p, price: p.price === null ? null : Number(p.price), old_price: p.old_price === null ? null : Number(p.old_price) }} services={services} />
            </section>
          ))}
          {!missingTables && !promosRes.data?.length && (
            <div className="p-card"><EmptyState>Nenhuma promoção ainda. Crie a primeira abaixo.</EmptyState></div>
          )}
          <details className="p-card" open={!promosRes.data?.length}>
            <summary className="flex items-center gap-2 px-5 py-3.5 text-[#2B221B] cursor-pointer">
              <Plus size={16} /> <span className="p-display text-xl">Nova promoção</span>
            </summary>
            <div className="px-5 pb-5"><PromotionForm services={services} /></div>
          </details>
        </div>
      )}

      {tab === "blog" && (
        <div className="grid gap-5">
          <Card
            title="Artigos"
            action={<Link href="/painel/site/blog/novo" className="p-btn p-btn-sm"><Plus size={14} /> Novo artigo</Link>}
            bodyClassName="p-0"
          >
            {(postsRes.data as BlogPostRow[] | null ?? []).length === 0 ? (
              <EmptyState>Nenhum artigo ainda.</EmptyState>
            ) : (
              <ul className="divide-y divide-[#F5EEE3]">
                {(postsRes.data as BlogPostRow[]).map((p) => (
                  <li key={p.slug}>
                    <Link href={`/painel/site/blog/${p.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FEFBF7]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: categoryColor(p.category) }} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate text-[#2B221B]">{p.title}</span>
                        <span className="block text-xs text-[#857566]">{p.category} · {fmtDate(p.published_on)}</span>
                      </span>
                      {p.featured && <Badge tone="gold"><Star size={10} /> Destaque</Badge>}
                      {!p.published && <Badge>Rascunho</Badge>}
                      <Pencil size={14} className="text-[#A69885]" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <SectionForm section="blog" values={content.blog} title="Seção do blog" eyebrow="Títulos e visibilidade" />
        </div>
      )}

      {tab === "contato" && (
        <div className="grid gap-5">
          <SectionForm section="contact" values={content.contact} title="Contato" eyebrow="Endereço, telefone e redes">
            <p className="text-xs text-[#857566] mb-4">
              O horário de atendimento exibido vem de{" "}
              <Link href="/painel/configuracoes" className="underline text-[#82590F]">Configurações</Link>, o mesmo usado pela agenda.
            </p>
          </SectionForm>
          <SectionForm section="footer" values={content.footer} title="Rodapé" />
        </div>
      )}

      {tab === "marca" && (
        <div className="grid gap-5">
          <SectionForm section="brand" values={content.brand} title="Logo e nome" />
          <SectionForm section="seo" values={content.seo} title="Google e compartilhamento" eyebrow="Como o site aparece nas buscas e no WhatsApp" />
        </div>
      )}
    </>
  );
}
