-- Gestão da clínica: configurações, bloqueios de agenda, pacotes de sessões,
-- prontuário (anamnese, evolução, fotos), estoque e contas a pagar/receber.

-- ─── Configurações (linha única) ────────────────────────────────────────
create table public.settings (
  id             smallint primary key default 1 check (id = 1),
  clinic_name    text not null default 'Talissa Estética e Bem Estar',
  whatsapp       text not null default '551165782211',
  address        text not null default 'Av. Paulista, 1337 - Bela Vista, São Paulo — SP',
  -- Por dia da semana (0 = domingo): null = fechado.
  business_hours jsonb not null default '{
    "0": null,
    "1": {"open": "09:00", "close": "20:00", "break_start": "12:00", "break_end": "13:00"},
    "2": {"open": "09:00", "close": "20:00", "break_start": "12:00", "break_end": "13:00"},
    "3": {"open": "09:00", "close": "20:00", "break_start": "12:00", "break_end": "13:00"},
    "4": {"open": "09:00", "close": "20:00", "break_start": "12:00", "break_end": "13:00"},
    "5": {"open": "09:00", "close": "20:00", "break_start": "12:00", "break_end": "13:00"},
    "6": {"open": "09:00", "close": "16:00", "break_start": null, "break_end": null}
  }'::jsonb,
  slot_step_min    integer not null default 30 check (slot_step_min in (15, 20, 30, 60)),
  min_lead_min     integer not null default 60 check (min_lead_min >= 0),
  max_days_ahead   integer not null default 90 check (max_days_ahead between 1 and 365),
  cancel_min_hours integer not null default 24 check (cancel_min_hours >= 0),
  fee_credit       numeric(5, 2) not null default 3.50 check (fee_credit between 0 and 30),
  fee_debit        numeric(5, 2) not null default 1.50 check (fee_debit between 0 and 30),
  templates        jsonb not null default '{
    "confirmacao": "Olá, {nome}! Aqui é da {clinica} 🌸 Passando para confirmar seu horário de {servico} em {data} às {hora}. Podemos confirmar?",
    "lembrete": "Oi, {nome}! Lembrete do seu horário amanhã ({data}) às {hora} para {servico}. Te esperamos! 💕 Se precisar remarcar: {link}",
    "pos_atendimento": "Oi, {nome}! Obrigada pela visita hoje 💕 Como você está se sentindo depois do {servico}? Qualquer dúvida sobre os cuidados em casa, é só chamar.",
    "retorno": "Oi, {nome}! Tudo bem? Aqui é da {clinica} 🌸 Já está na hora da sua próxima sessão de {servico}. Quer que eu reserve um horário para você?",
    "reativacao": "Oi, {nome}! Que saudade 💕 Faz tempo que você não vem aqui na {clinica}. Que tal agendar um momento de cuidado? Temos horários esta semana!",
    "aniversario": "Feliz aniversário, {nome}! 🎉💕 Toda a equipe da {clinica} deseja um dia lindo para você!"
  }'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.settings default values;

-- ─── Bloqueios de agenda (folgas, cursos, manutenção) ───────────────────
create table public.time_blocks (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text not null default 'Bloqueado',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_blocks_range_idx on public.time_blocks (starts_at, ends_at);

-- ─── Pacotes de sessões ─────────────────────────────────────────────────
create table public.packages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  service_id    text not null references public.services (id),
  sessions      integer not null check (sessions between 1 and 100),
  price         numeric(10, 2) not null check (price >= 0),
  validity_days integer check (validity_days > 0),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index packages_service_idx on public.packages (service_id);

create table public.client_packages (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  package_id     uuid references public.packages (id) on delete set null,
  service_id     text not null references public.services (id),
  name           text not null,
  sessions_total integer not null check (sessions_total between 1 and 100),
  price          numeric(10, 2) not null default 0 check (price >= 0),
  purchased_on   date not null default (now() at time zone 'America/Sao_Paulo')::date,
  expires_on     date,
  status         text not null default 'ativo' check (status in ('ativo', 'concluido', 'expirado', 'cancelado')),
  notes          text,
  created_at     timestamptz not null default now()
);
create index client_packages_client_idx on public.client_packages (client_id);
create index client_packages_package_idx on public.client_packages (package_id);
create index client_packages_service_idx on public.client_packages (service_id);

-- ─── Agendamentos: vínculo com pacote, link da cliente, lembretes ───────
alter table public.appointments
  add column client_package_id uuid references public.client_packages (id) on delete set null,
  add column public_token      uuid not null default gen_random_uuid(),
  add column confirmed_at      timestamptz,
  add column reminder_sent_at  timestamptz,
  add column cancel_reason     text;

create unique index appointments_public_token_key on public.appointments (public_token);
create index appointments_client_package_idx on public.appointments (client_package_id);

create view public.client_package_usage
with (security_invoker = true)
as
select
  cp.*,
  count(a.id) filter (where a.status = 'concluido')                           as sessions_used,
  count(a.id) filter (where a.status in ('solicitado', 'confirmado'))         as sessions_scheduled,
  cp.sessions_total - count(a.id) filter (where a.status = 'concluido')       as sessions_remaining
from public.client_packages cp
left join public.appointments a on a.client_package_id = cp.id
group by cp.id;

-- ─── Prontuário ─────────────────────────────────────────────────────────
alter table public.clients
  add column cpf               text,
  add column address           text,
  add column occupation        text,
  add column anamnesis         jsonb not null default '{}'::jsonb,
  add column consent_signed_at timestamptz;

create table public.session_records (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  record_date    date not null default (now() at time zone 'America/Sao_Paulo')::date,
  procedure      text not null,
  products_used  text,
  parameters     text,
  observations   text,
  next_steps     text,
  created_by     uuid references auth.users (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now()
);
create index session_records_client_idx on public.session_records (client_id, record_date desc);
create index session_records_appointment_idx on public.session_records (appointment_id);
create index session_records_created_by_idx on public.session_records (created_by);

create table public.client_photos (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  path       text not null unique,
  kind       text not null default 'evolucao' check (kind in ('antes', 'depois', 'evolucao')),
  taken_on   date not null default (now() at time zone 'America/Sao_Paulo')::date,
  caption    text,
  created_at timestamptz not null default now()
);
create index client_photos_client_idx on public.client_photos (client_id, taken_on desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-photos', 'client-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "staff reads client photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'client-photos' and (select private.is_staff()));
create policy "staff uploads client photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'client-photos' and (select private.is_staff()));
create policy "staff updates client photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'client-photos' and (select private.is_staff()))
  with check (bucket_id = 'client-photos' and (select private.is_staff()));
create policy "staff deletes client photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-photos' and (select private.is_staff()));

-- ─── Estoque ────────────────────────────────────────────────────────────
create table public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  brand      text,
  category   text not null default 'uso_cabine' check (category in ('uso_cabine', 'home_care')),
  unit       text not null default 'un',
  stock_qty  numeric(10, 2) not null default 0,
  min_qty    numeric(10, 2) not null default 0 check (min_qty >= 0),
  cost_price numeric(10, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(10, 2) not null default 0 check (sale_price >= 0),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind       text not null check (kind in ('entrada', 'saida', 'venda', 'ajuste')),
  -- Variação assinada do estoque (+ entrada, − saída/venda).
  qty        numeric(10, 2) not null check (qty <> 0),
  unit_cost  numeric(10, 2),
  note       text,
  client_id  uuid references public.clients (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_client_idx on public.stock_movements (client_id);

create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.products set stock_qty = stock_qty + new.qty where id = new.product_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.products set stock_qty = stock_qty - old.qty where id = old.product_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger stock_movements_apply
  after insert or delete on public.stock_movements
  for each row execute function private.apply_stock_movement();

-- ─── Financeiro: pendências, taxas e vínculos ───────────────────────────
alter table public.transactions
  add column status            text not null default 'pago' check (status in ('pago', 'pendente')),
  add column due_on            date,
  add column fee               numeric(10, 2) not null default 0 check (fee >= 0),
  add column client_package_id uuid references public.client_packages (id) on delete set null,
  add column stock_movement_id uuid references public.stock_movements (id) on delete set null;

create index transactions_status_due_idx on public.transactions (status, due_on) where status = 'pendente';
create index transactions_client_package_idx on public.transactions (client_package_id);
create index transactions_stock_movement_idx on public.transactions (stock_movement_id);

-- Total gasto passa a considerar apenas valores efetivamente pagos.
create or replace view public.client_stats
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
    where t.client_id = c.id and t.kind = 'receita' and t.status = 'pago'
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

-- ─── RLS e permissões ───────────────────────────────────────────────────
alter table public.settings        enable row level security;
alter table public.time_blocks     enable row level security;
alter table public.packages        enable row level security;
alter table public.client_packages enable row level security;
alter table public.session_records enable row level security;
alter table public.client_photos   enable row level security;
alter table public.products        enable row level security;
alter table public.stock_movements enable row level security;

create policy "staff manages settings" on public.settings
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages time_blocks" on public.time_blocks
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages packages" on public.packages
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages client_packages" on public.client_packages
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages session_records" on public.session_records
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages client_photos" on public.client_photos
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages products" on public.products
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "staff manages stock_movements" on public.stock_movements
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

revoke all on public.settings, public.time_blocks, public.packages, public.client_packages,
  public.session_records, public.client_photos, public.products, public.stock_movements,
  public.client_package_usage from anon, authenticated;

grant select, update on public.settings to authenticated;
grant select, insert, update, delete on
  public.time_blocks, public.packages, public.client_packages, public.session_records,
  public.client_photos, public.products, public.stock_movements
  to authenticated;
grant select on public.client_package_usage, public.client_stats to authenticated;

grant all on public.settings, public.time_blocks, public.packages, public.client_packages,
  public.session_records, public.client_photos, public.products, public.stock_movements,
  public.client_package_usage, public.client_stats to service_role;
