import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { blogPosts as staticPosts, services as staticServices } from "@/lib/data";
import { todaySP } from "@/lib/format";
import {
  BLOG_FALLBACK_IMAGE, DEFAULT_CONTENT, mergeContent,
  type BlogPost, type BlogPostRow, type HomeService, type Promotion, type ServiceIcon, type SiteContent,
} from "@/lib/site-content";

/**
 * Leitura do conteúdo público do site. Sem banco configurado (ou antes da migração),
 * tudo cai no conteúdo padrão, para o site nunca ficar em branco.
 */

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const db = createAdminClient();
  if (!db) return DEFAULT_CONTENT;
  const { data, error } = await db.from("site_content").select("section, content");
  if (error || !data) return DEFAULT_CONTENT;
  return mergeContent(data);
});

const STATIC_ICONS: Record<string, ServiceIcon> = {
  "limpeza-pele": "sparkles", "drenagem-linfatica": "waves", "massagem-relaxante": "heart",
};

/** Serviços marcados para aparecer nos cartões da página inicial. */
export const getHomeServices = cache(async (): Promise<HomeService[]> => {
  const fallback = staticServices.map((s) => ({
    id: s.id, name: s.title, description: s.description, icon: STATIC_ICONS[s.id] ?? "sparkles",
  }));
  const db = createAdminClient();
  if (!db) return fallback;
  const { data, error } = await db
    .from("services")
    .select("id, name, description, icon")
    .eq("active", true).eq("show_on_home", true)
    .order("sort_order").order("name");
  if (error) return fallback;
  return (data ?? []).map((s) => ({ ...s, description: s.description ?? "" })) as HomeService[];
});

/** Promoções ativas e dentro do período de validade. */
export const getActivePromotions = cache(async (): Promise<Promotion[]> => {
  const db = createAdminClient();
  if (!db) return [];
  const today = todaySP();
  const { data, error } = await db
    .from("promotions")
    .select("*")
    .eq("active", true)
    .order("sort_order").order("created_at");
  if (error) return [];
  return (data ?? [])
    .filter((p) => (!p.starts_on || p.starts_on <= today) && (!p.ends_on || p.ends_on >= today))
    .map((p) => ({
    ...p,
    price: p.price === null ? null : Number(p.price),
    old_price: p.old_price === null ? null : Number(p.old_price),
  })) as Promotion[];
});

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const STATIC_DATES: Record<string, string> = {
  "15 Mai 2025": "2025-05-15", "8 Mai 2025": "2025-05-08", "1 Mai 2025": "2025-05-01",
  "22 Abr 2025": "2025-04-22", "14 Abr 2025": "2025-04-14", "5 Abr 2025": "2025-04-05",
};

const toPost = (p: BlogPostRow): BlogPost => {
  const [y, m, d] = p.published_on.split("-").map(Number);
  return {
    ...p,
    date: `${d} ${MONTHS[m - 1]} ${y}`,
    readTime: `${p.read_minutes} min`,
    image: p.image_url || BLOG_FALLBACK_IMAGE,
  };
};

const STATIC_BLOG: BlogPostRow[] = staticPosts.map((p) => ({
  slug: p.slug, category: p.category, title: p.title, excerpt: p.excerpt, content: "",
  image_url: null, published_on: STATIC_DATES[p.date] ?? "2025-05-01",
  read_minutes: parseInt(p.readTime, 10) || 4, featured: Boolean(p.featured), published: true,
}));

/** Artigos publicados, destaque primeiro e depois do mais recente ao mais antigo. */
export const getBlogPosts = cache(async (): Promise<BlogPost[]> => {
  const db = createAdminClient();
  let rows = STATIC_BLOG;
  if (db) {
    const { data, error } = await db
      .from("blog_posts").select("*").eq("published", true).order("published_on", { ascending: false });
    if (!error && data) rows = data as BlogPostRow[];
  }
  return rows
    .map(toPost)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || b.published_on.localeCompare(a.published_on));
});

export async function getBlogPost(slug: string) {
  return (await getBlogPosts()).find((p) => p.slug === slug) ?? null;
}
