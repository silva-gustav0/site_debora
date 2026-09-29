import { Fragment } from "react";
import { navHidden } from "@/lib/vouchers";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Schedule from "@/components/Schedule";
import BlogSection from "@/components/BlogSection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import PromoNoticeSlot from "@/components/PromoNoticeSlot";
import CustomSection from "@/components/CustomSection";
import { getPublicConfig } from "@/app/actions/public";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { getActivePromotions, getBlogPosts, getHomeServices, getSiteContent } from "@/lib/site";

// Montada a cada acesso: edições do painel aparecem na hora (sem cache de páginas no Cloudflare).
export const dynamic = "force-dynamic";

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

  const { hidden, custom } = content.layout;
  const blocks = {
    hero: <Hero content={content.hero} brandName={content.brand.full_name} promo={promotions.find((p) => p.show_in_hero) ?? null} />,
    about: <About content={content.about} />,
    services: <Services content={content.services} services={services} promotions={promotions} />,
    schedule: <Schedule config={config} content={content.schedule} />,
    blog: posts.length > 0 && <BlogSection content={content.blog} posts={posts} />,
    contact: <Contact content={content.contact} hours={hours} />,
  };
  const menu = custom.filter((c) => c.menu_label).map((c) => ({ label: c.menu_label, hash: `secao-${c.id}` }));

  return (
    <>
      <Navbar logo={content.brand.logo} name={content.brand.full_name} hidden={navHidden(hidden)} extra={menu} />
      <main>
        {(Object.keys(blocks) as (keyof typeof blocks)[]).map((k) => (
          <Fragment key={k}>
            {!hidden.includes(k) && blocks[k]}
            {custom.filter((c) => c.after === k).map((c) => <CustomSection key={c.id} s={c} />)}
          </Fragment>
        ))}
      </main>
      <Footer brand={content.brand} contact={content.contact} footer={content.footer} services={services} hours={hours} hidden={hidden} />
      <PromoNoticeSlot />
    </>
  );
}
