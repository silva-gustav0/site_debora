import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogPosts } from "@/lib/data";
import { ArrowLeft, Clock, Calendar, ArrowRight } from "lucide-react";

const postImages: Record<string, string> = {
  "beneficios-limpeza-pele":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85",
  "drenagem-linfatica-saude":
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
  "skincare-em-casa":
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85",
  "poder-da-massagem":
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
  "peeling-renove-pele":
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=85",
  "rituais-de-spa":
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=85",
};

const catColors: Record<string, string> = {
  "Cuidados com a Pele": "#C8737A",
  "Tratamentos Corporais": "#C9973A",
  "Dicas de Beleza": "#4A9B6F",
  "Bem-Estar": "#6A7BC9",
  "SPA & Relaxamento": "#9B4AC8",
};

const postContent: Record<string, string> = {
  "beneficios-limpeza-pele": `A limpeza de pele profissional é um dos pilares mais importantes da rotina de cuidados estéticos. Diferente da limpeza domiciliar, o tratamento realizado em clínica especializada oferece uma remoção profunda de impurezas que o dia a dia não consegue eliminar.

**Por que fazer regularmente?**

Ao longo dos dias, nossa pele acumula oleosidade, resíduos de maquiagem, poluição e células mortas que bloqueiam os poros. Se não removidos adequadamente, esses resíduos formam comedões (cravos) e podem levar ao surgimento de acne e outros problemas cutâneos.

A limpeza profissional realizada mensalmente ou bimestralmente, dependendo do tipo de pele, oferece:

- Remoção profunda de impurezas e cravos
- Renovação celular acelerada
- Melhor absorção dos ativos cosméticos
- Pele mais luminosa e uniforme
- Redução de poros dilatados
- Prevenção de envelhecimento precoce

**O que esperar do tratamento?**

Na Clínica Debora Silva, o protocolo de limpeza de pele começa com uma análise individualizada da sua pele. Cada etapa é personalizada: higienização suave, esfoliação, vapor, extração de impurezas, mask hidratante e finalização com protetor solar.

O resultado imediato é uma pele visivelmente mais limpa, suave e radiante. Com a continuidade do tratamento, a melhora é progressiva e duradoura.

**Com que frequência?**

- Pele oleosa ou acneica: mensalmente
- Pele mista: a cada 45 dias
- Pele seca ou normal: a cada 60 dias

Agende uma avaliação gratuita com nossas especialistas e descubra o protocolo ideal para a sua pele.`,

  "drenagem-linfatica-saude": `A drenagem linfática manual é uma técnica de massagem terapêutica que estimula o fluxo da linfa pelo sistema linfático, promovendo a eliminação de toxinas, redução de edemas e fortalecimento do sistema imunológico.

**Muito além da estética**

Embora seja amplamente conhecida pelos benefícios estéticos — como redução de medidas e combate à celulite — a drenagem linfática oferece um espectro muito maior de benefícios para a saúde:

- Redução de edemas e inchaços
- Alívio de dores musculares
- Fortalecimento do sistema imunológico
- Melhora da circulação sanguínea
- Aceleração da recuperação pós-cirúrgica
- Redução do estresse e ansiedade
- Combate à celulite e gordura localizada

**Como funciona o tratamento?**

As manobras são suaves e rítmicas, aplicadas em direção aos linfonodos (gânglios). O movimento estimula a contração dos vasos linfáticos, acelerando o transporte da linfa e consequentemente a eliminação de líquidos retidos e toxinas.

Na Clínica Debora Silva, cada sessão é conduzida por profissionais certificadas, com protocolo adaptado às necessidades específicas de cada cliente.

**Indicações**

A drenagem é especialmente recomendada para quem sofre de retenção hídrica, quem está se recuperando de cirurgias, gestantes (com autorização médica), atletas em recuperação e pessoas com estilo de vida sedentário.`,
};

const defaultContent = (title: string) => `${title} é um tema fascinante no mundo da estética e bem-estar.

Neste artigo, exploramos os principais aspectos deste tratamento, seus benefícios comprovados pela ciência e como ele pode transformar não apenas a aparência, mas também a qualidade de vida de quem o adota em sua rotina.

**O que você vai descobrir**

Ao longo deste conteúdo, compartilhamos conhecimentos técnicos de forma acessível, dicas práticas que você pode aplicar no dia a dia e informações sobre como potencializar os resultados dos seus tratamentos na clínica.

**A importância do autocuidado**

Cuidar da aparência vai muito além da vaidade. É um ato de amor próprio que impacta diretamente na autoestima, na saúde mental e na forma como nos relacionamos com o mundo.

Na Clínica Debora Silva, acreditamos que cada pessoa merece se sentir bem consigo mesma. Por isso, nossos tratamentos são pensados de forma integrada, considerando não apenas o aspecto físico, mas o bem-estar emocional de cada cliente.

**Próximos passos**

Quer saber mais sobre este e outros tratamentos? Agende uma consulta de avaliação gratuita com nossa equipe. Juntas, vamos construir um protocolo personalizado para que você alcance os melhores resultados.`;

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "Artigo não encontrado" };
  return {
    title: `${post.title} | Blog Clínica Debora Silva`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const content = postContent[slug] || defaultContent(post.title);
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const color = catColors[post.category] || "#C8737A";

  return (
    <>
      <Navbar />
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
              className="text-4xl sm:text-5xl font-light text-rose-900 mb-5 leading-snug"
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
              <span className="w-1 h-1 rounded-full bg-rose-200" />
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
            <div className="w-full h-64 sm:h-80 rounded-2xl mb-12 relative overflow-hidden shadow-[0_16px_50px_rgba(200,115,122,0.15)]">
              <Image
                src={postImages[slug] || postImages["beneficios-limpeza-pele"]}
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
            <p
              className="text-xl font-light italic leading-8 text-text-secondary mb-8 pb-8 border-b border-rose-100"
              style={{ fontFamily: "var(--font-cormorant), serif" }}
            >
              {post.excerpt}
            </p>

            {/* Content */}
            <div
              className="prose-custom"
              style={{
                fontFamily: "var(--font-lato), sans-serif",
                color: "#6B4C52",
              }}
            >
              {content.split("\n\n").map((block, i) => {
                if (block.startsWith("**") && block.endsWith("**")) {
                  return (
                    <h2
                      key={i}
                      className="text-2xl font-light text-rose-800 mt-10 mb-4"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      {block.replace(/\*\*/g, "")}
                    </h2>
                  );
                }
                if (block.includes("\n-")) {
                  const parts = block.split("\n");
                  const intro = parts[0];
                  const items = parts.slice(1).filter((l) => l.startsWith("-"));
                  return (
                    <div key={i} className="mb-6">
                      {intro && (
                        <p className="text-base font-light leading-8 mb-3">{intro}</p>
                      )}
                      <ul className="flex flex-col gap-2">
                        {items.map((item, j) => (
                          <li key={j} className="flex items-start gap-3">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0"
                              style={{ background: color }}
                            />
                            <span className="text-sm font-light leading-7">
                              {item.replace(/^-\s*/, "")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-base font-light leading-8 mb-6">
                    {block.replace(/\*\*/g, "")}
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
                className="text-2xl font-light text-rose-800 mb-3"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Pronta para experimentar?
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
        <section className="py-16" style={{ background: "#F7F2EC" }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <h3
              className="text-3xl font-light text-rose-800 mb-8 text-center"
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
                  style={{ background: "white", border: "1px solid #F9C7CE" }}
                >
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={postImages[p.slug] || postImages["beneficios-limpeza-pele"]}
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
                        color: catColors[p.category] || "#C8737A",
                      }}
                    >
                      {p.category}
                    </span>
                    <h4
                      className="text-lg font-light text-rose-800 leading-snug group-hover:text-rose-600 transition-colors"
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
      </main>
      <Footer />
    </>
  );
}
