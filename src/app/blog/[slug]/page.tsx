import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPublicConfig } from "@/app/actions/public";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { getBlogPost, getBlogPosts, getHomeServices, getSiteContent } from "@/lib/site";
import { categoryColor } from "@/lib/site-content";
import { ArrowLeft, Clock, Calendar, ArrowRight } from "lucide-react";

// Artigos novos ou editados no painel aparecem sem novo deploy.
export const revalidate = 300;

export function generateStaticParams() {
  return [];
}

const defaultContent = (title: string, clinic: string) => `${title} é um tema fascinante no mundo da estética e bem-estar.

Neste artigo, exploramos os principais aspectos deste tratamento, seus benefícios comprovados pela ciência e como ele pode transformar não apenas a aparência, mas também a qualidade de vida de quem o adota em sua rotina.

**O que você vai descobrir**

Ao longo deste conteúdo, compartilhamos conhecimentos técnicos de forma acessível, dicas práticas que você pode aplicar no dia a dia e informações sobre como potencializar os resultados dos seus tratamentos na clínica.

**A importância do autocuidado**

Cuidar da aparência vai muito além da vaidade. É um ato de amor próprio que impacta diretamente na autoestima, na saúde mental e na forma como nos relacionamos com o mundo.

Na ${clinic}, acreditamos que cada pessoa merece se sentir bem consigo mesma. Por isso, nossos tratamentos são pensados de forma integrada, considerando não apenas o aspecto físico, mas o bem-estar emocional de cada cliente.

**Próximos passos**

Quer saber mais sobre este e outros tratamentos? Agende uma consulta de avaliação. Em parceria, vamos construir um protocolo personalizado para que você alcance os melhores resultados.`;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, { brand }] = await Promise.all([getBlogPost(slug), getSiteContent()]);
  if (!post) return { title: "Artigo não encontrado" };
  return {
    title: `${post.title} | Blog ${brand.full_name}`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, posts, content, services, config] = await Promise.all([
    getBlogPost(slug), getBlogPosts(), getSiteContent(), getHomeServices(), getPublicConfig(),
  ]);
  if (!post) notFound();

  const { brand } = content;
  const body = post.content.trim() || defaultContent(post.title, brand.full_name);
  const related = posts.filter((p) => p.slug !== slug).slice(0, 3);
  const color = categoryColor(post.category);

  return (
    <>
      <Navbar logo={brand.logo} name={brand.full_name} />
      <main>
        {/* Hero */}
        <section
          className="pt-36 pb-16"
          style={{
            background: `linear-gradient(135deg, ${color}10 0%, #FDFAF7 60%, #FFF8E7 100%)`,
          }}
        >
          <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[11px] tracking-widest uppercase mb-8 hover:opacity-70 transition-opacity"
              style={{ fontFamily: "var(--font-lato), sans-serif", color }}
            >
              <ArrowLeft size={12} /> Voltar ao Blog
            </Link>

            <span
              className="inline-block text-[10px] tracking-widest uppercase px-3 py-1 rounded-full mb-5"
              style={{
                fontFamily: "var(--font-lato), sans-serif",
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {post.category}
            </span>

            <h1
              className="text-4xl sm:text-5xl font-light text-bronze-900 mb-5 leading-snug"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {post.title}
            </h1>

            <div
              className="gold-line mx-auto mb-5"
            />

            <div className="flex items-center justify-center gap-4 text-text-muted">
              <span
                className="flex items-center gap-1.5 text-[12px]"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                <Calendar size={12} /> {post.date}
              </span>
              <span className="w-1 h-1 rounded-full bg-bronze-200" />
              <span
                className="flex items-center gap-1.5 text-[12px]"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                <Clock size={12} /> {post.readTime} de leitura
              </span>
            </div>
          </div>
        </section>

        {/* Article */}
        <section className="py-16 bg-[#FDFAF7]">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            {/* Banner image */}
            <div className="w-full h-64 sm:h-80 rounded-2xl mb-12 relative overflow-hidden shadow-[0_16px_50px_rgba(154,111,30,0.15)]">
              <Image
                src={post.image}
                alt={post.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(160deg, ${color}10 0%, transparent 50%)`,
                }}
              />
            </div>

            {/* Lead */}
            {post.excerpt && (
              <p
                className="text-xl font-light italic leading-8 text-text-secondary mb-8 pb-8 border-b border-bronze-100"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                {post.excerpt}
              </p>
            )}

            {/* Content: parágrafos separados por linha em branco, **Título** e listas com "- " */}
            <div
              className="prose-custom"
              style={{
                fontFamily: "var(--font-lato), sans-serif",
                color: "#6B5A4B",
              }}
            >
              {body.split(/\n\s*\n/).map((block, i) => {
                const trimmed = block.trim();
                if (trimmed.startsWith("**") && trimmed.endsWith("**") && !trimmed.includes("\n")) {
                  return (
                    <h2
                      key={i}
                      className="text-2xl font-light text-bronze-800 mt-10 mb-4"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      {trimmed.replace(/\*\*/g, "")}
                    </h2>
                  );
                }
                const lines = trimmed.split("\n");
                const items = lines.filter((l) => /^\s*-\s/.test(l));
                if (items.length) {
                  const intro = lines.filter((l) => !/^\s*-\s/.test(l)).join(" ");
                  return (
                    <div key={i} className="mb-6">
                      {intro && (
                        <p className="text-base font-light leading-8 mb-3">{intro.replace(/\*\*/g, "")}</p>
                      )}
                      <ul className="flex flex-col gap-2">
                        {items.map((item, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                              style={{ background: color }}
                            />
                            <span className="text-sm font-light leading-7">
                              {item.replace(/^\s*-\s*/, "").replace(/\*\*/g, "")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-base font-light leading-8 mb-6 whitespace-pre-line">
                    {trimmed.replace(/\*\*/g, "")}
                  </p>
                );
              })}
            </div>

            {/* CTA */}
            <div
              className="mt-14 p-8 rounded-2xl text-center"
              style={{
                background: `linear-gradient(135deg, ${color}08, ${color}15)`,
                border: `1px solid ${color}25`,
              }}
            >
              <h3
                className="text-2xl font-light text-bronze-800 mb-3"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Quer experimentar?
              </h3>
              <p
                className="text-sm font-light text-text-secondary mb-6"
                style={{ fontFamily: "var(--font-lato), sans-serif" }}
              >
                Agende sua consulta e descubra o tratamento ideal para você.
              </p>
              <Link href="/#agendamento" className="btn-primary">
                Agendar Consulta <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-16" style={{ background: "#F7F2EC" }}>
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <h3
                className="text-3xl font-light text-bronze-800 mb-8 text-center"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Artigos Relacionados
              </h3>
              <div className="grid sm:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group block rounded-xl overflow-hidden hover-lift"
                    style={{ background: "white", border: "1px solid #EEDFBF" }}
                  >
                    <div className="relative h-36 overflow-hidden">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-400 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-5">
                      <span
                        className="text-[9.5px] tracking-widest uppercase block mb-2"
                        style={{
                          fontFamily: "var(--font-lato), sans-serif",
                          color: categoryColor(p.category),
                        }}
                      >
                        {p.category}
                      </span>
                      <h4
                        className="text-lg font-light text-bronze-800 leading-snug group-hover:text-bronze-600 transition-colors"
                        style={{ fontFamily: "var(--font-cormorant), serif" }}
                      >
                        {p.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer
        brand={brand} contact={content.contact} footer={content.footer} services={services}
        hours={hoursSummary(config?.hours ?? DEFAULT_HOURS)}
      />
    </>
  );
}
