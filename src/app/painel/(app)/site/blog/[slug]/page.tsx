import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { todaySP } from "@/lib/format";
import { BLOG_CATEGORY_COLORS, type BlogPostRow } from "@/lib/site-content";
import ActionForm from "@/components/painel/ActionForm";
import ConfirmButton from "@/components/painel/ConfirmButton";
import ImageField from "@/components/painel/ImageField";
import SubmitButton from "@/components/painel/SubmitButton";
import { Alert, Card, PageHeader } from "@/components/painel/ui";
import { deleteBlogPost, saveBlogPost } from "@/app/painel/site-actions";

export const metadata = { title: "Artigo do blog" };

export default async function BlogPostEditor({ params, searchParams }: PageProps<"/painel/site/blog/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await requireStaff();
  const isNew = slug === "novo";

  let post: BlogPostRow | null = null;
  if (!isNew) {
    const { data } = await supabase.from("blog_posts").select("*").eq("slug", slug).maybeSingle();
    if (!data) notFound();
    post = data as BlogPostRow;
  }
  const p = post;

  return (
    <>
      <PageHeader
        eyebrow="Site · Blog"
        title={p ? p.title : "Novo artigo"}
        actions={
          <>
            <Link href="/painel/site?tab=blog" className="p-btn-ghost"><ArrowLeft size={14} /> Artigos</Link>
            {p?.published && (
              <a href={`/blog/${p.slug}`} target="_blank" className="p-btn-ghost"><ExternalLink size={14} /> Ver no site</a>
            )}
          </>
        }
      />

      {sp.salvo && <div className="mb-5"><Alert tone="green">Artigo salvo.</Alert></div>}

      <ActionForm action={saveBlogPost} className="grid xl:grid-cols-[1fr_340px] gap-5 items-start">
        {p && <input type="hidden" name="original_slug" value={p.slug} />}
        <Card title="Texto">
          <div className="grid gap-4">
            <label>
              <span className="p-label">Título</span>
              <input name="title" required defaultValue={p?.title} className="p-input" />
            </label>
            <label>
              <span className="p-label">Resumo (aparece na lista e abaixo do título)</span>
              <textarea name="excerpt" rows={3} defaultValue={p?.excerpt} className="p-input resize-y" />
            </label>
            <label>
              <span className="p-label">Conteúdo</span>
              <textarea name="content" rows={22} defaultValue={p?.content} className="p-input resize-y font-[inherit] leading-6" />
              <span className="block text-[11px] text-[#A69885] mt-1">
                Deixe uma linha em branco entre parágrafos. Subtítulo: <code>**Assim**</code> sozinho na linha. Lista: linhas começando com <code>- </code>.
              </span>
            </label>
          </div>
        </Card>

        <div className="grid gap-5">
          <Card title="Publicação">
            <div className="grid gap-3">
              <label className="flex items-center gap-2 text-sm text-[#4A3C30]">
                <input type="checkbox" name="published" defaultChecked={p?.published ?? true} className="accent-[#82590F] w-4 h-4" />
                Publicado no site
              </label>
              <label className="flex items-center gap-2 text-sm text-[#4A3C30]">
                <input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} className="accent-[#82590F] w-4 h-4" />
                Artigo em destaque (o grande da página inicial)
              </label>
              <label>
                <span className="p-label">Categoria</span>
                <input name="category" list="blog-categories" defaultValue={p?.category ?? "Cuidados com a Pele"} className="p-input" />
                <datalist id="blog-categories">
                  {Object.keys(BLOG_CATEGORY_COLORS).map((c) => <option key={c} value={c} />)}
                </datalist>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="p-label">Data</span>
                  <input name="published_on" type="date" defaultValue={p?.published_on ?? todaySP()} className="p-input" />
                </label>
                <label>
                  <span className="p-label">Leitura (min)</span>
                  <input name="read_minutes" type="number" min={1} max={60} defaultValue={p?.read_minutes ?? 4} className="p-input p-num" />
                </label>
              </div>
              <label>
                <span className="p-label">Endereço</span>
                <span className="flex items-center gap-1 text-sm text-[#857566]">
                  /blog/<input name="slug" defaultValue={p?.slug ?? ""} placeholder="gerado pelo título" className="p-input" />
                </span>
              </label>
            </div>
          </Card>
          <Card title="Foto de capa">
            <ImageField name="image_url" label="Foto" defaultValue={p?.image_url ?? ""} folder="blog" aspect="aspect-[16/9]" />
          </Card>
          <SubmitButton pendingText="Salvando…">{p ? "Salvar artigo" : "Criar artigo"}</SubmitButton>
        </div>
      </ActionForm>

      {p && (
        <form action={deleteBlogPost} className="mt-8">
          <input type="hidden" name="slug" value={p.slug} />
          <ConfirmButton confirmText="Excluir artigo"><Trash2 size={13} /> Excluir artigo</ConfirmButton>
        </form>
      )}
    </>
  );
}
