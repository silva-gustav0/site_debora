import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { categoryColor, type BlogPost, type SiteContent } from "@/lib/site-content";
import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

export default function BlogSection({ content: c, posts }: { content: SiteContent["blog"]; posts: BlogPost[] }) {
  const [featured, ...rest] = posts;

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
              <span className="section-label">{c.eyebrow}</span>
            </AnimateIn>
            <AnimateIn animation="up" delay={100}>
              <h2
                className="text-4xl sm:text-5xl font-light mt-4 mb-5"
                style={{ fontFamily: "var(--font-cormorant), serif", color: "#3B2A12" }}
              >
                {c.title}{" "}
                <em className="italic font-normal" style={{ color: "#9A6F1E" }}>
                  {c.title_highlight}
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
                  src={featured.image}
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
                      background: categoryColor(featured.category),
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
                      src={post.image}
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
                        color: categoryColor(post.category),
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
