import AnimateIn from "./AnimateIn";
import { blogPosts } from "@/lib/data";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

const catColors: Record<string, string> = {
  "Cuidados com a Pele": "#C8737A",
  "Tratamentos Corporais": "#C9973A",
  "Dicas de Beleza": "#4A9B6F",
  "Bem-Estar": "#6A7BC9",
  "SPA & Relaxamento": "#9B4AC8",
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
                className="text-4xl sm:text-5xl font-light text-rose-900 mt-4 mb-5"
                style={{ fontFamily: "var(--font-cormorant), serif" }}
              >
                Nosso{" "}
                <em className="italic font-normal" style={{ color: "#C8737A" }}>
                  Blog
                </em>
              </h2>
            </AnimateIn>
            <AnimateIn animation="scale" delay={200}>
              <div className="gold-line" />
            </AnimateIn>
          </div>
          <AnimateIn animation="fade" delay={300}>
            <Link
              href="/blog"
              className="btn-outline flex items-center gap-2 whitespace-nowrap"
            >
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
                border: "1px solid #F9C7CE",
                boxShadow: "0 2px 20px rgba(200,115,122,0.07)",
              }}
            >
              {/* Image placeholder */}
              <div
                className="blog-img-placeholder h-64 flex items-end p-6 relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 30% 40%, #C8737A 0%, transparent 50%), radial-gradient(circle at 70% 60%, #C9973A 0%, transparent 50%)",
                  }}
                />
                <div className="relative z-10">
                  <span
                    className="inline-block text-[10px] tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                    style={{
                      fontFamily: "var(--font-lato), sans-serif",
                      background: catColors[featured.category] || "#C8737A",
                      color: "white",
                    }}
                  >
                    {featured.category}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-[11px] text-text-muted"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    {featured.date}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-rose-200" />
                  <span
                    className="flex items-center gap-1 text-[11px] text-text-muted"
                    style={{ fontFamily: "var(--font-lato), sans-serif" }}
                  >
                    <Clock size={10} /> {featured.readTime} de leitura
                  </span>
                </div>
                <h3
                  className="text-2xl font-light text-rose-800 mb-3 leading-snug group-hover:text-rose-600 transition-colors"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  {featured.title}
                </h3>
                <p
                  className="text-sm font-light leading-7 text-text-secondary mb-5"
                  style={{ fontFamily: "var(--font-lato), sans-serif" }}
                >
                  {featured.excerpt}
                </p>
                <div className="flex items-center gap-2 text-rose-500">
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
              <AnimateIn key={post.slug} animation="right" delay={i * 100 as any}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex gap-4 rounded-xl overflow-hidden hover-lift p-4"
                  style={{
                    background: "white",
                    border: "1px solid #F9C7CE",
                    boxShadow: "0 1px 12px rgba(200,115,122,0.05)",
                  }}
                >
                  {/* Mini image */}
                  <div
                    className="blog-img-placeholder w-20 h-20 rounded-xl flex-shrink-0 relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(135deg, ${catColors[post.category] || "#C8737A"}20, ${catColors[post.category] || "#C8737A"}40)`,
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[9.5px] tracking-widest uppercase mb-1 block"
                      style={{
                        fontFamily: "var(--font-lato), sans-serif",
                        color: catColors[post.category] || "#C8737A",
                      }}
                    >
                      {post.category}
                    </span>
                    <h4
                      className="text-base font-light text-rose-800 leading-snug group-hover:text-rose-600 transition-colors line-clamp-2"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      {post.title}
                    </h4>
                    <p
                      className="text-[11px] text-text-muted mt-1"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
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
