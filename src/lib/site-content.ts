/**
 * Conteúdo editável do site: valores padrão (o texto original) e os campos que o
 * painel mostra em cada área. O que estiver salvo em `site_content` sobrepõe o padrão.
 */

export type ItemField = { key: string; label: string; textarea?: boolean };
export type Field =
  | { key: string; label: string; type: "text" | "textarea" | "image" | "lines" | "toggle"; hint?: string; rows?: number }
  | { key: string; label: string; type: "items"; fields: ItemField[]; hint?: string };

export const DEFAULT_CONTENT = {
  brand: {
    logo: "/images/clinica/logo.png",
    name: "Débora Silva",
    full_name: "Clínica Débora Silva",
    tagline: "Estética & Bem-Estar",
  },
  seo: {
    title: "Clínica Débora Silva",
    description:
      "Clínica de estética em São Paulo para mulheres e homens. Limpeza de pele, drenagem linfática, massagem relaxante. Agende sua consulta.",
  },
  hero: {
    badge: "Para Mulheres e Homens",
    title: "Sua Beleza,",
    title_highlight: "Nossa Arte",
    subtitle:
      "Um espaço criado especialmente para quem se cuida. Da limpeza de pele à massagem relaxante, cada atendimento é personalizado com técnica, segurança e acolhimento genuíno.",
    cta_primary: "Agendar Consulta",
    cta_secondary: "Nossos Serviços",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80",
    stats: [
      { value: "3", label: "Serviços especializados" },
      { value: "100%", label: "Satisfação dos clientes" },
      { value: "1:1", label: "Atendimento individual" },
    ],
    rating_label: "Avaliação dos Clientes",
    rating_value: "5.0",
    card_label: "Próximo horário",
    card_title: "Hoje 14:30",
    card_text: "Massagem Relaxante",
  },
  about: {
    eyebrow: "Quem Somos",
    title: "Sobre a",
    title_highlight: "Clínica Débora Silva",
    image: "/images/clinica/img4.png",
    quote: "Cada pessoa merece um espaço de cuidado, acolhimento e bem-estar verdadeiros.",
    quote_author: "Clínica Débora Silva",
    text:
      "A Clínica Débora Silva oferece serviços estéticos para mulheres e homens. Nosso espaço foi pensado para oferecer conforto, acolhimento, segurança e experiências únicas de autocuidado em São Paulo.\n\nAqui, o atendimento é feito pessoalmente pela Débora, com compromisso com a excelência. O trabalho é pautado por ética, empatia e atendimento humanizado, proporcionando experiências únicas de cuidado, autoestima e bem-estar.",
    bullets: [
      "Atendimento para mulheres e homens",
      "Profissional certificada e em constante atualização",
      "Protocolos de higiene e segurança rigorosos",
      "Ambiente moderno, sofisticado e acolhedor",
    ],
    pillars: [
      {
        title: "Missão",
        text: "Promover bem-estar, autoestima e qualidade de vida a mulheres e homens por meio de serviços de estética e relaxamento realizados com profissionalismo, segurança e atendimento humanizado.",
      },
      {
        title: "Visão",
        text: "Ser referência local em estética e bem-estar, reconhecida pela excelência no atendimento, ambiente acolhedor e fidelização dos clientes.",
      },
      {
        title: "Valores",
        text: "Ética, empatia e atendimento humanizado em cada sessão. Compromisso com a excelência, respeito à individualidade e dedicação ao bem-estar de cada cliente.",
      },
    ],
  },
  services: {
    eyebrow: "O Que Oferecemos",
    title: "Nossos",
    title_highlight: "Serviços",
    subtitle: "Atendimentos personalizados para cuidar da beleza, relaxamento e bem-estar.",
    cta: "Agendar",
  },
  schedule: {
    eyebrow: "Agende sua Visita",
    title: "Faça seu",
    title_highlight: "Agendamento",
  },
  blog: {
    visible: true,
    eyebrow: "Conteúdo & Dicas",
    title: "Nosso",
    title_highlight: "Blog",
    page_subtitle: "Dicas de beleza, cuidados com a pele e tudo sobre bem-estar para você incorporar no seu dia a dia.",
  },
  contact: {
    eyebrow: "Fale Conosco",
    title: "Entre em",
    title_highlight: "Contato",
    intro:
      "Estamos à disposição para atender você com todo o cuidado e atenção que você merece. Entre em contato pelos canais abaixo ou envie uma mensagem.",
    address: "Av. Paulista, 1337 - Bela Vista\nSão Paulo — SP",
    maps_url: "https://maps.google.com/?q=Av.+Paulista+1337+Bela+Vista+São+Paulo",
    phone: "(11) 6578-2211",
    email: "contato@talissaestetica.com.br",
    instagram: "@talissaesteticaebemestar",
    success_text: "Obrigada pelo seu contato. Retornaremos em até 24 horas.",
  },
  footer: {
    text: "Cuidamos da sua beleza com técnica, dedicação e o carinho que você merece. Cada atendimento é uma experiência única.",
    made_in: "São Paulo",
  },
};

export type SiteContent = typeof DEFAULT_CONTENT;
export type SectionKey = keyof SiteContent;

const TITLE_FIELDS: Field[] = [
  { key: "eyebrow", label: "Texto pequeno acima do título", type: "text" },
  { key: "title", label: "Título", type: "text" },
  { key: "title_highlight", label: "Título (parte destacada em dourado)", type: "text" },
];

/** Campos editáveis de cada seção, na ordem em que aparecem no painel. */
export const SECTION_FIELDS: Record<SectionKey, Field[]> = {
  brand: [
    { key: "logo", label: "Logo", type: "image", hint: "PNG com fundo transparente fica melhor." },
    { key: "name", label: "Nome curto (rodapé)", type: "text" },
    { key: "full_name", label: "Nome completo", type: "text", hint: "Usado nos textos alternativos das fotos e no rodapé." },
    { key: "tagline", label: "Frase abaixo do nome (rodapé)", type: "text" },
  ],
  seo: [
    { key: "title", label: "Título da página (aba do navegador e Google)", type: "text" },
    { key: "description", label: "Descrição para o Google e WhatsApp", type: "textarea", rows: 3, hint: "Até uns 160 caracteres." },
  ],
  hero: [
    { key: "image", label: "Foto principal", type: "image", hint: "Vertical (4:5) fica melhor." },
    { key: "badge", label: "Selo acima do título", type: "text", hint: "Deixe vazio para esconder." },
    { key: "title", label: "Título", type: "text" },
    { key: "title_highlight", label: "Título (parte destacada em dourado)", type: "text" },
    { key: "subtitle", label: "Texto de apresentação", type: "textarea", rows: 3 },
    { key: "cta_primary", label: "Botão principal", type: "text" },
    { key: "cta_secondary", label: "Botão secundário", type: "text" },
    {
      key: "stats", label: "Números em destaque", type: "items", hint: "Deixe o número vazio para esconder um item.",
      fields: [{ key: "value", label: "Número" }, { key: "label", label: "Legenda" }],
    },
    { key: "rating_label", label: "Cartão de avaliação: legenda", type: "text" },
    { key: "rating_value", label: "Cartão de avaliação: nota", type: "text", hint: "Deixe vazio para esconder o cartão." },
    { key: "card_label", label: "Cartão lateral: legenda", type: "text" },
    { key: "card_title", label: "Cartão lateral: destaque", type: "text", hint: "Deixe vazio para esconder o cartão." },
    { key: "card_text", label: "Cartão lateral: texto", type: "text" },
  ],
  about: [
    ...TITLE_FIELDS,
    { key: "image", label: "Foto", type: "image" },
    { key: "text", label: "Texto", type: "textarea", rows: 7, hint: "Deixe uma linha em branco entre parágrafos." },
    { key: "bullets", label: "Destaques (um por linha)", type: "lines", rows: 4 },
    { key: "quote", label: "Frase abaixo da foto", type: "textarea", rows: 2 },
    { key: "quote_author", label: "Assinatura da frase", type: "text" },
    {
      key: "pillars", label: "Missão, visão e valores", type: "items",
      fields: [{ key: "title", label: "Título" }, { key: "text", label: "Texto", textarea: true }],
    },
  ],
  services: [
    ...TITLE_FIELDS,
    { key: "subtitle", label: "Texto abaixo do título", type: "textarea", rows: 2 },
    { key: "cta", label: "Link dos cartões", type: "text" },
  ],
  schedule: TITLE_FIELDS,
  blog: [
    { key: "visible", label: "Mostrar o blog na página inicial", type: "toggle" },
    ...TITLE_FIELDS,
    { key: "page_subtitle", label: "Texto no topo da página do blog", type: "textarea", rows: 2 },
  ],
  contact: [
    ...TITLE_FIELDS,
    { key: "intro", label: "Texto de apresentação", type: "textarea", rows: 3 },
    { key: "address", label: "Endereço", type: "textarea", rows: 2 },
    { key: "maps_url", label: "Link do Google Maps", type: "text" },
    { key: "phone", label: "Telefone exibido", type: "text" },
    { key: "email", label: "E-mail", type: "text" },
    { key: "instagram", label: "Instagram (@usuario)", type: "text" },
    { key: "success_text", label: "Mensagem após enviar o formulário", type: "textarea", rows: 2 },
  ],
  footer: [
    { key: "text", label: "Texto do rodapé", type: "textarea", rows: 3 },
    { key: "made_in", label: "“Feito com ♥ em…”", type: "text" },
  ],
};

type Json = Record<string, unknown>;

/** Sobrepõe o que veio do banco ao padrão, aceitando só chaves conhecidas e com o tipo certo. */
export function mergeSection<T extends Json>(defaults: T, raw: unknown): T {
  if (!raw || typeof raw !== "object") return defaults;
  const src = raw as Json;
  const out: Json = { ...defaults };
  for (const [key, def] of Object.entries(defaults)) {
    const v = src[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(def)) {
      if (!Array.isArray(v)) continue;
      out[key] = typeof def[0] === "object"
        ? def.map((d, i) => mergeSection(d as Json, v[i]))
        : v.filter((x) => typeof x === "string");
    } else if (typeof v === typeof def) {
      // Foto vazia volta para a padrão.
      out[key] = typeof v === "string" && !v && /image|logo/.test(key) ? def : v;
    }
  }
  return out as T;
}

export function mergeContent(rows: { section: string; content: unknown }[]): SiteContent {
  const bySection = new Map(rows.map((r) => [r.section, r.content]));
  const out = {} as Record<SectionKey, Json>;
  for (const key of Object.keys(DEFAULT_CONTENT) as SectionKey[]) {
    out[key] = mergeSection(DEFAULT_CONTENT[key] as Json, bySection.get(key));
  }
  return out as SiteContent;
}

/** Link do Instagram a partir do @usuario (ou de uma URL já completa). */
export const instagramUrl = (handle: string) =>
  /^https?:\/\//.test(handle) ? handle : `https://instagram.com/${handle.replace(/^@/, "")}`;

export const telHref = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d ? `tel:+${d.startsWith("55") ? d : `55${d}`}` : null;
};

export const SERVICE_ICONS = {
  sparkles: "Brilho",
  waves: "Ondas",
  heart: "Coração",
  flower: "Flor",
  leaf: "Folha",
  sun: "Sol",
  droplet: "Gota",
  gem: "Joia",
  hand: "Mão",
  star: "Estrela",
} as const;
export type ServiceIcon = keyof typeof SERVICE_ICONS;

export type Promotion = {
  id: string;
  label: string;
  title: string;
  description: string | null;
  price: number | null;
  old_price: number | null;
  cta_label: string;
  image_url: string | null;
  service_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
  show_in_hero: boolean;
  sort_order: number;
};

export type HomeService = { id: string; name: string; description: string; icon: ServiceIcon };

export type BlogPostRow = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  image_url: string | null;
  published_on: string;
  read_minutes: number;
  featured: boolean;
  published: boolean;
};

export type BlogPost = BlogPostRow & { date: string; readTime: string; image: string };

export const BLOG_CATEGORY_COLORS: Record<string, string> = {
  "Cuidados com a Pele": "#9A6F1E",
  "Tratamentos Corporais": "#C9973A",
  "Dicas de Beleza": "#6B8F71",
  "Bem-Estar": "#7D6B58",
  "SPA & Relaxamento": "#6B4A10",
};
export const categoryColor = (c: string) => BLOG_CATEGORY_COLORS[c] ?? "#9A6F1E";

export const BLOG_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85";
