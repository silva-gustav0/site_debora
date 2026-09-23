-- Talissa Estética — schema inicial
-- Clientes, serviços, agendamentos, financeiro e CRM (interações/follow-ups).
-- Acesso: somente membros da equipe (tabela staff). O site público grava
-- agendamentos/mensagens pelo servidor usando a service role.

create schema if not exists private;

-- ─── Equipe ─────────────────────────────────────────────────────────────
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff where user_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_staff() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

-- ─── Serviços ───────────────────────────────────────────────────────────
create table public.services (
  id           text primary key,
  name         text not null,
  category     text not null default 'facial'
                 check (category in ('facial', 'corporal', 'terapias', 'combo')),
  description  text,
  duration_min integer not null default 60 check (duration_min between 15 and 480),
  price        numeric(10, 2) not null default 0 check (price >= 0),
  return_days  integer check (return_days > 0),
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ─── Clientes ───────────────────────────────────────────────────────────
create table public.clients (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            text,
  email            text,
  birth_date       date,
  instagram        text,
  source           text not null default 'outro'
                     check (source in ('site', 'instagram', 'whatsapp', 'indicacao', 'passante', 'outro')),
  stage            text not null default 'lead'
                     check (stage in ('lead', 'em_contato', 'cliente', 'vip', 'inativa')),
  tags             text[] not null default '{}',
  notes            text,
  skin_type        text,
  allergies        text,
  health_notes     text,
  marketing_opt_in boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index clients_phone_key on public.clients (phone) where phone is not null;
create index clients_email_idx on public.clients (lower(email));
create index clients_stage_idx on public.clients (stage);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_touch_updated_at
  before update on public.clients
  for each row execute function private.touch_updated_at();

-- ─── Agendamentos ───────────────────────────────────────────────────────
create table public.appointments (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  service_id text not null references public.services (id),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     text not null default 'solicitado'
               check (status in ('solicitado', 'confirmado', 'concluido', 'cancelado', 'faltou')),
  price      numeric(10, 2) not null default 0 check (price >= 0),
  notes      text,
  source     text not null default 'painel' check (source in ('site', 'painel')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Uma única profissional: dois atendimentos ativos não podem se sobrepor.
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('solicitado', 'confirmado', 'concluido'))
);

create index appointments_starts_at_idx on public.appointments (starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);
create index appointments_service_idx on public.appointments (service_id);

-- ─── Financeiro ─────────────────────────────────────────────────────────
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('receita', 'despesa')),
  category       text not null default 'Atendimento',
  description    text,
  amount         numeric(10, 2) not null check (amount > 0),
  method         text not null default 'pix'
                   check (method in ('pix', 'dinheiro', 'credito', 'debito', 'transferencia', 'outro')),
  occurred_on    date not null default (now() at time zone 'America/Sao_Paulo')::date,
  client_id      uuid references public.clients (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  created_at     timestamptz not null default now()
);

create index transactions_occurred_on_idx on public.transactions (occurred_on);
create index transactions_client_idx on public.transactions (client_id);
create index transactions_appointment_idx on public.transactions (appointment_id);

-- ─── CRM: interações e follow-ups ───────────────────────────────────────
create table public.interactions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  kind       text not null default 'nota'
               check (kind in ('nota', 'whatsapp', 'ligacao', 'mensagem_site', 'followup')),
  content    text not null,
  due_on     date,
  done_at    timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index interactions_client_idx on public.interactions (client_id, created_at desc);
create index interactions_open_followups_idx on public.interactions (due_on)
  where due_on is not null and done_at is null;
create index interactions_created_by_idx on public.interactions (created_by);

-- ─── Estatísticas por cliente (recorrência) ─────────────────────────────
create view public.client_stats
with (security_invoker = true)
as
select
  c.id as client_id,
  count(a.id) filter (where a.status = 'concluido')                       as visits,
  min(a.starts_at) filter (where a.status = 'concluido')                  as first_visit,
  max(a.starts_at) filter (where a.status = 'concluido')                  as last_visit,
  min(a.starts_at) filter (where a.status in ('solicitado', 'confirmado')
                             and a.starts_at > now())                      as next_appointment,
  count(a.id) filter (where a.status = 'faltou')                          as no_shows,
  (
    select coalesce(sum(t.amount), 0)
    from public.transactions t
    where t.client_id = c.id and t.kind = 'receita'
  )                                                                        as total_spent,
  (
    select a2.service_id
    from public.appointments a2
    where a2.client_id = c.id and a2.status = 'concluido'
    order by a2.starts_at desc
    limit 1
  )                                                                        as last_service_id,
  case
    when count(a.id) filter (where a.status = 'concluido') > 1 then
      extract(epoch from (
        max(a.starts_at) filter (where a.status = 'concluido')
        - min(a.starts_at) filter (where a.status = 'concluido')
      )) / 86400 / (count(a.id) filter (where a.status = 'concluido') - 1)
  end                                                                      as avg_interval_days
from public.clients c
left join public.appointments a on a.client_id = c.id
group by c.id;

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table public.staff        enable row level security;
alter table public.services     enable row level security;
alter table public.clients      enable row level security;
alter table public.appointments enable row level security;
alter table public.transactions enable row level security;
alter table public.interactions enable row level security;

create policy "staff can read team" on public.staff
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_staff()));

create policy "public can read active services" on public.services
  for select to anon, authenticated
  using (active or (select private.is_staff()));

create policy "staff manages services" on public.services
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy "staff manages clients" on public.clients
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy "staff manages appointments" on public.appointments
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy "staff manages transactions" on public.transactions
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy "staff manages interactions" on public.interactions
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ─── Exposição no Data API (tabelas novas não são expostas por padrão) ──
revoke all on public.staff, public.services, public.clients, public.appointments,
  public.transactions, public.interactions, public.client_stats from anon, authenticated;

grant select on public.services to anon;
grant select on public.staff to authenticated;
grant select, insert, update, delete on
  public.services, public.clients, public.appointments, public.transactions, public.interactions
  to authenticated;
grant select on public.client_stats to authenticated;

grant all on public.staff, public.services, public.clients, public.appointments,
  public.transactions, public.interactions, public.client_stats to service_role;

-- ─── Serviços iniciais (preços editáveis no painel) ─────────────────────
insert into public.services (id, name, category, description, duration_min, price, return_days, sort_order) values
  ('limpeza-pele', 'Limpeza de Pele', 'facial',
   'Higienização profunda que auxilia na remoção de impurezas, revitalização e cuidado facial.',
   90, 0, 30, 1),
  ('drenagem-linfatica', 'Drenagem Linfática', 'corporal',
   'Técnica manual que auxilia na redução da retenção de líquidos e melhora da circulação.',
   60, 0, 7, 2),
  ('massagem-relaxante', 'Massagem Relaxante', 'terapias',
   'Movimentos terapêuticos para aliviar tensões e reduzir o estresse.',
   60, 0, 30, 3),
  ('promo-inauguracao', 'Limpeza de Pele + 10 min Massagem Relaxante', 'combo',
   'Promoção de inauguração: tratamento completo a preço especial.',
   100, 300, 30, 0)
on conflict (id) do nothing;
