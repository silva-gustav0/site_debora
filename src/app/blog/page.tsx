import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { blogPosts } from "@/lib/data";
import { ArrowRight, Clock, ArrowLeft } from "lucide-react";

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

const catColors: Record<string, string> = {
  "Cuidados com a Pele": "#C8737A",
  "Tratamentos Corporais": "#C9973A",
  "Dicas de Beleza": "#4A9B6F",
  "Bem-Estar": "#6A7BC9",
  "SPA & Relaxamento": "#9B4AC8",
};

export const metadata = {
  title: "Blog | Clínica Debora Silva",
  description: "Dicas de beleza, cuidados com a pele e bem-estar do blog da Clínica Debora Silva.",
};

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Header */}
        <section
          className="pt-36 pb-20 text-center"
          style={{ background: "linear-gradient(135deg,#FFF5F7 0%,#FDFAF7 50%,#FFF8E7 100%)" }}
        >
          <span className="section-label">Conteúdo & Inspiração</span>
          <h1
            className="text-5xl sm:text-6xl font-light text-rose-900 mt-4 mb-5"
            style={{ fontFamily: "var(--font-cormorant), serif" }}
          >
            Nosso <em className="italic font-normal" style={{ color: "#C8737A" }}>Blog</em>
          </h1>
          <div
            className="gold-line mx-auto mb-6"
          />
          <p
            className="text-base font-light text-text-secondary max-w-md mx-auto leading-7"
            style={{ fontFamily: "var(--font-lato), sans-serif" }}
          >
            Dicas de beleza, cuidados com a pele e tudo sobre bem-estar para você incorporar
            no seu dia a dia.
          </p>
        </section>

        <section className="py-20 bg-[#FDFAF7]">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {blogPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl overflow-hidden hover-lift"
                  style={{
                    background: "white",
                    border: "1px solid #F9C7CE",
                    boxShadow: "0 2px 20px rgba(200,115,122,0.07)",
                  }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={postImages[post.slug]}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(44,26,30,0.2) 0%, transparent 60%)" }}
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
                        color: catColors[post.category] || "#C8737A",
                      }}
                    >
                      {post.category}
                    </span>
                    <h2
                      className="text-xl font-light text-rose-800 mb-3 leading-snug group-hover:text-rose-600 transition-colors"
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
                      <div className="flex items-center gap-1.5 text-rose-500">
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
      <Footer />
    </>
  );
}
