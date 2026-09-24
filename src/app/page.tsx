import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Schedule from "@/components/Schedule";
import BlogSection from "@/components/BlogSection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getPublicConfig } from "@/app/actions/public";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { getActivePromotions, getBlogPosts, getHomeServices, getSiteContent } from "@/lib/site";

// Conteúdo, serviços e horários vêm do banco; o painel revalida ao salvar, e isto é a rede de segurança.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSiteContent();
  return {
    title: seo.title,
    description: seo.description,
    openGraph: { title: seo.title, description: seo.description, type: "website" },
  };
}

export default async function Home() {
  const [config, content, services, promotions, posts] = await Promise.all([
    getPublicConfig(),
    getSiteContent(),
    getHomeServices(),
    getActivePromotions(),
    getBlogPosts(),
  ]);
  const hours = hoursSummary(config?.hours ?? DEFAULT_HOURS);

  return (
    <>
      <Navbar logo={content.brand.logo} name={content.brand.full_name} />
      <main>
        <Hero content={content.hero} brandName={content.brand.full_name} promo={promotions.find((p) => p.show_in_hero) ?? null} />
        <About content={content.about} />
        <Services content={content.services} services={services} promotions={promotions} />
        <Schedule config={config} content={content.schedule} />
        {content.blog.visible && posts.length > 0 && <BlogSection content={content.blog} posts={posts} />}
        <Contact content={content.contact} hours={hours} />
      </main>
      <Footer brand={content.brand} contact={content.contact} footer={content.footer} services={services} hours={hours} />
    </>
  );
}
