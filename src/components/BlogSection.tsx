import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { blogPosts } from "@/lib/data";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

const catColors: Record<string, string> = {
  "Cuidados com a Pele": "#9A6F1E",
  "Tratamentos Corporais": "#C9973A",
  "Dicas de Beleza": "#6B8F71",
  "Bem-Estar": "#7D6B58",
  "SPA & Relaxamento": "#6B4A10",
};

const postImages: Record<string, string> = {
  "beneficios-limpeza-pele":
    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=700&q=80",
  "drenagem-linfatica-saude":
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=700&q=80",
  "skincare-em-casa":
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
  "poder-da-massagem":
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=700&q=80",
  "peeling-renove-pele":
    "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=700&q=80",
  "rituais-de-spa":
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=700&q=80",
};

export default function BlogSection() {
  const [featured, ...rest] = blogPosts;

  return (
    <section
      id="blog"
      className="py-28 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7F2EC 0%, #FDFAF7 100%)" }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14">
          <div>
            <AnimateIn animation="fade">
              <span className="section-label">Conteúdo & Dicas</span>
            </AnimateIn>
            <AnimateIn animation="up" delay={100}>
              <h2
                className="text-4xl sm:text-5xl font-light mt-4 mb-5"
                style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
              >
                Nosso{" "}
                <em className="italic font-normal" style={{ color: "#9A6F1E" }}>
                  Blog
                </em>
              </h2>
            </AnimateIn>
            <AnimateIn animation="scale" delay={200}>
              <div className="gold-line" />
            </AnimateIn>
          </div>
          <AnimateIn animation="fade" delay={300}>
            <Link href="/blog" className="btn-outline flex items-center gap-2 whitespace-nowrap">
              Ver Todos os Artigos <ArrowRight size={13} />
            </Link>
          </AnimateIn>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Featured post */}
          <AnimateIn animation="left" delay={100} className="lg:col-span-3">
            <Link
              href={`/blog/${featured.slug}`}
              className="group block rounded-2xl overflow-hidden hover-lift h-full"
              style={{
                background: "white",
                border: "1px solid #EEDFBF",
                boxShadow: "0 2px 20px rgba(154,111,30,0.07)",
              }}
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={postImages[featured.slug]}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(43,34,27,0.35) 0%, transparent 60%)",
                  }}
                />
                <div className="absolute bottom-4 left-5">
                  <span
                    className="inline-block text-[10px] tracking-widest uppercase px-3 py-1 rounded-full text-white"
                    style={{
                      fontFamily: "var(--font-lato), sans-serif",
                      background: catColors[featured.category] || "#9A6F1E",
                    }}
                  >
                    {featured.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-[11px]"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: "#8F8070" }}
                  >
                    {featured.date}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-bronze-200" />
                  <span
                    className="flex items-center gap-1 text-[11px]"
                    style={{ fontFamily: "var(--font-lato), sans-serif", color: "#8F8070" }}
                  >
                    <Clock size={10} /> {featured.readTime} de leitura
                  </span>
                </div>
                <h3
                  className="text-2xl font-light mb-3 leading-snug group-hover:text-bronze-600 transition-colors"
                  style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
                >
                  {featured.title}
                </h3>
                <p
                  className="text-sm font-light leading-7 mb-5"
                  style={{ fontFamily: "var(--font-lato), sans-serif", color: "#6B5A4B" }}
                >
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-2" style={{ color: "#9A6F1E" }}>
                  <span
                    className="text-[11px] tracking-widest uppercase"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    Ler artigo
                  </span>
                  <ArrowRight
                    size={13}
                    className="transition-transform group-hover:translate-x-1 duration-200"
                  />
                </div>
              </div>
            </Link>
          </AnimateIn>

          {/* Secondary posts */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {rest.slice(0, 4).map((post, i) => (
              <AnimateIn key={post.slug} animation="right" delay={i * 100}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex gap-4 rounded-xl overflow-hidden hover-lift p-4"
                  style={{
                    background: "white",
                    border: "1px solid #EEDFBF",
                    boxShadow: "0 1px 12px rgba(154,111,30,0.05)",
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden">
                    <Image
                      src={postImages[post.slug]}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-400 group-hover:scale-110"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[9.5px] tracking-widest uppercase mb-1 block"
                      style={{
                        fontFamily: "var(--font-lato), sans-serif",
                        color: catColors[post.category] || "#9A6F1E",
                      }}
                    >
                      {post.category}
                    </span>
                    <h4
                      className="text-base font-light leading-snug group-hover:text-bronze-600 transition-colors line-clamp-2"
                      style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
                    >
                      {post.title}
                    </h4>
                    <p
                      className="text-[11px] mt-1"
                      style={{ fontFamily: "var(--font-lato), sans-serif", color: "#8F8070" }}
                    >
                      {post.date} · {post.readTime}
                    </p>
                  </div>
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
