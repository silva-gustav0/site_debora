"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/dal";
import { bool, fail, int, isDate, isUuid, money, opt, str } from "@/lib/form";
import { DEFAULT_CONTENT, SECTION_FIELDS, type SectionKey } from "@/lib/site-content";
import type { ActionState } from "@/lib/types";

/** O site público e o painel leem o mesmo conteúdo: revalida tudo. */
const done = (message: string): ActionState => {
  revalidatePath("/", "layout");
  return { ok: true, message };
};

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
};
const FOLDERS = ["marca", "inicio", "sobre", "promocoes", "blog"];

/** Aceita caminho local (/images/...) ou URL https. */
const imageUrl = (fd: FormData, key: string) => {
  const v = str(fd, key, 1000);
  return v.startsWith("/") || v.startsWith("https://") ? v : "";
};

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

export async function uploadSiteImage(fd: FormData): Promise<UploadResult> {
  const { supabase } = await requireStaff();
  const file = fd.get("file");
  const folder = FOLDERS.includes(str(fd, "folder")) ? str(fd, "folder") : "geral";
  if (!(file instanceof File) || !file.size) return { ok: false, message: "Selecione uma foto." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, message: "Formato não suportado. Use JPG, PNG ou WEBP." };
  if (file.size > 4 * 1024 * 1024) return { ok: false, message: "A foto passa de 4 MB." };

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, {
    contentType: file.type, cacheControl: "31536000",
  });
  if (error) return { ok: false, message: "Não foi possível enviar a foto. A migração do banco já foi aplicada?" };
  const { data } = supabase.storage.from("site-media").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

// ─── Textos e fotos por seção ──────────────────────────────────────────
export async function saveSection(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const section = str(fd, "section") as SectionKey;
  const fields = SECTION_FIELDS[section];
  if (!fields) return fail("Seção inválida.");

  const content: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.type) {
      case "text": content[f.key] = str(fd, f.key, 300); break;
      case "textarea": content[f.key] = str(fd, f.key, 5000); break;
      case "image": content[f.key] = imageUrl(fd, f.key); break;
      case "toggle": content[f.key] = bool(fd, f.key); break;
      case "lines":
        content[f.key] = str(fd, f.key, 3000).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20);
        break;
      case "items": {
        const defaults = (DEFAULT_CONTENT[section] as Record<string, unknown>)[f.key] as unknown[];
        content[f.key] = defaults.map((_, i) =>
          Object.fromEntries(f.fields.map((sf) => [sf.key, str(fd, `${f.key}.${i}.${sf.key}`, sf.textarea ? 1500 : 200)])),
        );
        break;
      }
    }
  }

  const { error } = await supabase.from("site_content").upsert({ section, content });
  if (error) return fail("Não foi possível salvar. A migração do banco já foi aplicada?");
  return done("Salvo! O site já está atualizado.");
}

export async function resetSection(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("site_content").delete().eq("section", str(fd, "section"));
  revalidatePath("/", "layout");
}

// ─── Promoções ─────────────────────────────────────────────────────────
export async function savePromotion(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  const title = str(fd, "title", 160);
  const price = money(fd, "price");
  const oldPrice = money(fd, "old_price");
  const startsOn = str(fd, "starts_on");
  const endsOn = str(fd, "ends_on");
  const sortOrder = int(fd, "sort_order");
  if (title.length < 3) return fail("Informe o título da promoção.");
  if (str(fd, "price") && !(price >= 0)) return fail("Preço inválido.");
  if (str(fd, "old_price") && !(oldPrice >= 0)) return fail("Preço “de” inválido.");
  if (isDate(startsOn) && isDate(endsOn) && endsOn < startsOn) return fail("A data final é antes da inicial.");

  const row = {
    label: str(fd, "label", 60) || "Promoção",
    title,
    description: opt(fd, "description", 400),
    price: Number.isFinite(price) ? price : null,
    old_price: Number.isFinite(oldPrice) ? oldPrice : null,
    cta_label: str(fd, "cta_label", 40) || "Aproveitar oferta",
    image_url: imageUrl(fd, "image_url") || null,
    service_id: opt(fd, "service_id", 80),
    starts_on: isDate(startsOn) ? startsOn : null,
    ends_on: isDate(endsOn) ? endsOn : null,
    active: bool(fd, "active"),
    show_in_hero: bool(fd, "show_in_hero"),
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  };

  // Só uma promoção aparece no cartão do topo.
  if (row.show_in_hero) {
    let q = supabase.from("promotions").update({ show_in_hero: false }).eq("show_in_hero", true);
    if (isUuid(id)) q = q.neq("id", id);
    await q;
  }

  const { error } = isUuid(id)
    ? await supabase.from("promotions").update(row).eq("id", id)
    : await supabase.from("promotions").insert(row);
  if (error) return fail("Não foi possível salvar a promoção.");
  return done(isUuid(id) ? "Promoção atualizada." : "Promoção criada.");
}

export async function deletePromotion(fd: FormData) {
  const { supabase } = await requireStaff();
  const id = str(fd, "id");
  if (isUuid(id)) await supabase.from("promotions").delete().eq("id", id);
  revalidatePath("/", "layout");
}

// ─── Blog ──────────────────────────────────────────────────────────────
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

export async function saveBlogPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const original = str(fd, "original_slug");
  const title = str(fd, "title", 200);
  const slug = slugify(str(fd, "slug", 120) || title);
  const date = str(fd, "published_on");
  const minutes = int(fd, "read_minutes");
  if (title.length < 3) return fail("Informe o título do artigo.");
  if (!slug || slug === "novo") return fail("Informe um endereço (slug) válido para o artigo.");

  const row = {
    slug,
    title,
    category: str(fd, "category", 60) || "Bem-Estar",
    excerpt: str(fd, "excerpt", 600),
    content: str(fd, "content", 30000),
    image_url: imageUrl(fd, "image_url") || null,
    published_on: isDate(date) ? date : undefined,
    read_minutes: minutes >= 1 && minutes <= 60 ? minutes : 4,
    featured: bool(fd, "featured"),
    published: bool(fd, "published"),
  };

  if (row.featured) {
    await supabase.from("blog_posts").update({ featured: false }).eq("featured", true).neq("slug", original || slug);
  }

  const { error } = original
    ? await supabase.from("blog_posts").update(row).eq("slug", original)
    : await supabase.from("blog_posts").insert(row);
  if (error) {
    return fail(error.code === "23505" ? "Já existe um artigo com esse endereço." : "Não foi possível salvar o artigo.");
  }
  revalidatePath("/", "layout");
  if (!original || original !== slug) redirect(`/painel/site/blog/${slug}?salvo=1`);
  return done("Artigo salvo.");
}

export async function deleteBlogPost(fd: FormData) {
  const { supabase } = await requireStaff();
  await supabase.from("blog_posts").delete().eq("slug", str(fd, "slug"));
  revalidatePath("/", "layout");
  redirect("/painel/site?tab=blog");
}
