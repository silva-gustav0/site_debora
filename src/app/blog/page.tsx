import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getBlogPosts, getHomeServices, getSiteContent } from "@/lib/site";
import { categoryColor } from "@/lib/site-content";
import { getPublicConfig } from "@/app/actions/public";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { ArrowRight, Clock, ArrowLeft } from "lucide-react";

export const revalidate = 300;

export async function generateMetadata() {
  const { brand } = await getSiteContent();
  return {
    title: `Blog | ${brand.full_name}`,
    description: `Dicas de beleza, cuidados com a pele e bem-estar do blog da ${brand.full_name}.`,
  };
}

export default async function BlogPage() {
  const [content, posts, services, config] = await Promise.all([
    getSiteContent(), getBlogPosts(), getHomeServices(), getPublicConfig(),
  ]);
  const { brand, blog } = content;

  return (
    <>
      <Navbar logo={brand.logo} name={brand.full_name} />
      <main>
        {/* Header */}
        <section
          className="pt-36 pb-20 text-center"
          style={{ background: "linear-gradient(135deg,#FBF7EE 0%,#FDFAF7 50%,#FFF8E7 100%)" }}
        >
          <span className="section-label">Conteúdo & Inspiração</span>
          <h1
            className="text-5xl sm:text-6xl font-light text-bronze-900 mt-4 mb-5"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            {blog.title} <em className="italic font-normal" style={{ color: "#9A6F1E" }}>{blog.title_highlight}</em>
          </h1>
          <div
            className="gold-line mx-auto mb-6"
          />
          <p
            className="text-base font-light text-text-secondary max-w-md mx-auto leading-7"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            {blog.page_subtitle}
          </p>
        </section>

        <section className="py-20 bg-[#FDFAF7]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl overflow-hidden hover-lift"
                  style={{
                    background: "white",
                    border: "1px solid #EEDFBF",
                    boxShadow: "0 2px 20px rgba(154,111,30,0.07)",
                  }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(43,34,27,0.2) 0%, transparent 60%)" }}
                    />
                    {post.featured && (
                      <div
                        className="absolute top-4 left-4 px-2.5 py-0.5 rounded-full text-[9px] tracking-widest uppercase text-white"
                        style={{
                          background: "linear-gradient(135deg,#C9973A,#E8C882)",
                          fontFamily: "var(--font-lato), sans-serif",
                        }}
                      >
                        Destaque
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <span
                      className="text-[9.5px] tracking-widest uppercase block mb-3"
                      style={{
                        fontFamily: "var(--font-lato), sans-serif",
                        color: categoryColor(post.category),
                      }}
                    >
                      {post.category}
                    </span>
                    <h2
                      className="text-xl font-light text-bronze-800 mb-3 leading-snug group-hover:text-bronze-600 transition-colors"
                      style={{ fontFamily: "var(--font-cormorant), serif" }}
                    >
                      {post.title}
                    </h2>
                    <p
                      className="text-sm font-light leading-6 text-text-muted mb-5 line-clamp-2"
                      style={{ fontFamily: "var(--font-lato), sans-serif" }}
                    >
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center gap-1.5 text-text-muted text-[11px]"
                        style={{ fontFamily: "var(--font-lato), sans-serif" }}
                      >
                        <Clock size={11} /> {post.readTime}
                      </div>
                      <div className="flex items-center gap-1.5 text-bronze-500">
                        <span
                          className="text-[10.5px] tracking-widest uppercase"
                          style={{ fontFamily: "var(--font-lato), sans-serif" }}
                        >
                          Ler
                        </span>
                        <ArrowRight
                          size={12}
                          className="transition-transform group-hover:translate-x-1 duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-14">
              <Link href="/" className="btn-outline inline-flex items-center gap-2">
                <ArrowLeft size={13} /> Voltar ao Site
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer
        brand={brand} contact={content.contact} footer={content.footer} services={services}
        hours={hoursSummary(config?.hours ?? DEFAULT_HOURS)}
      />
    </>
  );
}
