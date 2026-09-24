-- Conteúdo editável do site pelo painel: textos por seção, promoções, blog e fotos.
-- O site lê tudo pelo servidor (service role); só a equipe grava.

-- ─── Textos e fotos por seção (hero, sobre, contato…) ───────────────────
create table public.site_content (
  section    text primary key check (section ~ '^[a-z_]{2,40}$'),
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_content_touch_updated_at
  before update on public.site_content
  for each row execute function private.touch_updated_at();

-- ─── Promoções ──────────────────────────────────────────────────────────
create table public.promotions (
  id          uuid primary key default gen_random_uuid(),
  label       text not null default 'Promoção',
  title       text not null,
  description text,
  price       numeric(10, 2) check (price >= 0),
  old_price   numeric(10, 2) check (old_price >= 0),
  cta_label   text not null default 'Aproveitar oferta',
  image_url   text,
  service_id  text references public.services (id) on delete set null,
  starts_on   date,
  ends_on     date,
  active      boolean not null default true,
  show_in_hero boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index promotions_service_idx on public.promotions (service_id);

insert into public.promotions (label, title, description, price, cta_label, service_id, show_in_hero, sort_order)
select 'Promoção de Inauguração', 'Limpeza de Pele + 10 min Massagem Relaxante',
       'Tratamento completo a preço especial de inauguração', 300, 'Aproveitar Oferta',
       (select id from public.services where id = 'promo-inauguracao'), true, 0;

-- ─── Serviços: destaque na home e ícone ─────────────────────────────────
alter table public.services
  add column show_on_home boolean not null default false,
  add column icon         text not null default 'sparkles'
                            check (icon in ('sparkles', 'waves', 'heart', 'flower', 'leaf', 'sun', 'droplet', 'gem', 'hand', 'star'));

update public.services set show_on_home = true, icon = 'sparkles' where id = 'limpeza-pele';
update public.services set show_on_home = true, icon = 'waves'    where id = 'drenagem-linfatica';
update public.services set show_on_home = true, icon = 'heart'    where id = 'massagem-relaxante';

-- ─── Blog ───────────────────────────────────────────────────────────────
create table public.blog_posts (
  slug         text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category     text not null default 'Bem-Estar',
  title        text not null,
  excerpt      text not null default '',
  content      text not null default '',
  image_url    text,
  published_on date not null default (now() at time zone 'America/Sao_Paulo')::date,
  read_minutes integer not null default 4 check (read_minutes between 1 and 60),
  featured     boolean not null default false,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index blog_posts_published_idx on public.blog_posts (published_on desc) where published;

create trigger blog_posts_touch_updated_at
  before update on public.blog_posts
  for each row execute function private.touch_updated_at();

insert into public.blog_posts (slug, category, title, excerpt, image_url, published_on, read_minutes, featured, content) values
('beneficios-limpeza-pele', 'Cuidados com a Pele', 'Os Benefícios da Limpeza de Pele Regular',
 'Saiba por que a limpeza de pele profissional é indispensável na sua rotina de beleza e como ela transforma a saúde da sua pele a longo prazo.',
 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=85', '2025-05-15', 4, true,
$post$A limpeza de pele profissional é um dos pilares mais importantes da rotina de cuidados estéticos. Diferente da limpeza domiciliar, o tratamento realizado em clínica especializada oferece uma remoção profunda de impurezas que o dia a dia não consegue eliminar.

**Por que fazer regularmente?**

Ao longo dos dias, nossa pele acumula oleosidade, resíduos de maquiagem, poluição e células mortas que bloqueiam os poros. Se não removidos adequadamente, esses resíduos formam comedões (cravos) e podem levar ao surgimento de acne e outros problemas cutâneos.

A limpeza profissional realizada mensalmente ou bimestralmente, dependendo do tipo de pele, oferece:
- Remoção profunda de impurezas e cravos
- Renovação celular acelerada
- Melhor absorção dos ativos cosméticos
- Pele mais luminosa e uniforme
- Redução de poros dilatados
- Prevenção de envelhecimento precoce

**O que esperar do tratamento?**

Na Clínica Débora Silva, o protocolo de limpeza de pele começa com uma análise individualizada da sua pele. Cada etapa é personalizada: higienização suave, esfoliação, vapor, extração de impurezas, máscara hidratante e finalização com protetor solar.

O resultado imediato é uma pele visivelmente mais limpa, suave e radiante. Com a continuidade do tratamento, a melhora é progressiva e duradoura.

**Com que frequência?**

- Pele oleosa ou acneica: mensalmente
- Pele mista: a cada 45 dias
- Pele seca ou normal: a cada 60 dias

Agende uma avaliação e descubra o protocolo ideal para a sua pele.$post$),
('drenagem-linfatica-saude', 'Tratamentos Corporais', 'Drenagem Linfática: Saúde e Beleza em Um Só Tratamento',
 'Descubra como a drenagem linfática vai além da estética, beneficiando o sistema imunológico e promovendo saúde de dentro para fora.',
 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85', '2025-05-08', 5, false,
$post$A drenagem linfática manual é uma técnica de massagem terapêutica que estimula o fluxo da linfa pelo sistema linfático, promovendo a eliminação de toxinas, redução de edemas e fortalecimento do sistema imunológico.

**Muito além da estética**

Embora seja amplamente conhecida pelos benefícios estéticos — como redução de medidas e combate à celulite — a drenagem linfática oferece um espectro muito maior de benefícios para a saúde:
- Redução de edemas e inchaços
- Alívio de dores musculares
- Fortalecimento do sistema imunológico
- Melhora da circulação sanguínea
- Aceleração da recuperação pós-cirúrgica
- Redução do estresse e ansiedade
- Combate à celulite e gordura localizada

**Como funciona o tratamento?**

As manobras são suaves e rítmicas, aplicadas em direção aos linfonodos (gânglios). O movimento estimula a contração dos vasos linfáticos, acelerando o transporte da linfa e consequentemente a eliminação de líquidos retidos e toxinas.

Na Clínica Débora Silva, cada sessão é conduzida por uma profissional certificada, com protocolo adaptado às necessidades específicas de cada cliente.

**Indicações**

A drenagem é especialmente recomendada para quem sofre de retenção hídrica, quem está se recuperando de cirurgias, gestantes (com autorização médica), atletas em recuperação e pessoas com estilo de vida sedentário.$post$),
('skincare-em-casa', 'Dicas de Beleza', 'Como Cuidar da Pele em Casa Entre as Sessões',
 'Guia prático com rotina matinal e noturna, produtos essenciais e hábitos que potencializam os resultados dos seus tratamentos na clínica.',
 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85', '2025-05-01', 6, false, ''),
('poder-da-massagem', 'Bem-Estar', 'Massagem Relaxante: O Poder do Toque na Saúde',
 'Entenda a ciência por trás do toque terapêutico e como a massagem regular impacta positivamente a saúde física e emocional.',
 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85', '2025-04-22', 4, false, ''),
('peeling-renove-pele', 'Cuidados com a Pele', 'Peeling: Renove Sua Pele e Sua Autoestima',
 'Conheça os diferentes tipos de peeling, suas indicações e como esse tratamento revoluciona a textura e luminosidade da pele.',
 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=85', '2025-04-14', 5, false, ''),
('rituais-de-spa', 'SPA & Relaxamento', 'Day Spa: Uma Experiência Transformadora',
 'Mergulhe no universo do bem-estar e descubra como um dia de SPA pode redefinir sua relação com o autocuidado e a autoestima.',
 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=85', '2025-04-05', 3, false, '')
on conflict (slug) do nothing;

-- ─── Fotos do site (bucket público) ─────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "staff uploads site media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-media' and (select private.is_staff()));
create policy "staff updates site media" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and (select private.is_staff()))
  with check (bucket_id = 'site-media' and (select private.is_staff()));
create policy "staff deletes site media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and (select private.is_staff()));

-- ─── RLS e permissões ───────────────────────────────────────────────────
alter table public.site_content enable row level security;
alter table public.promotions   enable row level security;
alter table public.blog_posts   enable row level security;

create policy "staff manages site_content" on public.site_content
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages promotions" on public.promotions
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages blog_posts" on public.blog_posts
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

revoke all on public.site_content, public.promotions, public.blog_posts from anon, authenticated;
grant select, insert, update, delete on public.site_content, public.promotions, public.blog_posts to authenticated;
grant all on public.site_content, public.promotions, public.blog_posts to service_role;
