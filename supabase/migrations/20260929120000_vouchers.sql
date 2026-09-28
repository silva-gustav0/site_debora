-- Vouchers (vale-presente): comprados no site pela InfinitePay ou criados pela equipe.
-- Um voucher vale um serviço específico ou um valor em reais (com saldo).
create table public.vouchers (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^DS-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  kind           text not null check (kind in ('servico', 'valor')),
  service_id     text references public.services (id) on delete set null,
  service_name   text,
  amount         numeric(10, 2) not null check (amount > 0),
  balance        numeric(10, 2) not null check (balance >= 0),
  buyer_name     text not null,
  buyer_email    text,
  buyer_phone    text,
  for_self       boolean not null default true,
  recipient_name text,
  message        text check (char_length(message) <= 300),
  -- pendente = aguardando pagamento; ativo = pode ser usado; usado = saldo zerado.
  status         text not null default 'pendente' check (status in ('pendente', 'ativo', 'usado', 'cancelado')),
  source         text not null default 'site' check (source in ('site', 'painel')),
  order_nsu      uuid not null unique default gen_random_uuid(),
  payment        jsonb,
  paid_at        timestamptz,
  expires_on     date,
  used_at        timestamptz,
  created_at     timestamptz not null default now(),
  check (kind = 'valor' or service_id is not null or status <> 'pendente')
);
create index vouchers_status_idx on public.vouchers (status, created_at desc);

alter table public.appointments add column if not exists voucher_id uuid references public.vouchers (id) on delete set null;
create index if not exists appointments_voucher_idx on public.appointments (voucher_id);

-- Só a equipe lê e altera; o site usa o servidor (service role), com validação.
alter table public.vouchers enable row level security;
create policy "staff manages vouchers" on public.vouchers
  for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));
revoke all on public.vouchers from anon, authenticated;
grant select, insert, update, delete on public.vouchers to authenticated;
grant all on public.vouchers to service_role;

-- Tempo real no painel (LiveSync).
alter publication supabase_realtime add table public.vouchers;
