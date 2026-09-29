-- Endurecimento de segurança (vistoria de 28/09/2026).

-- ─── Privilégios padrão: objetos novos em public não nascem abertos ao anon ──
-- Cada migração concede explicitamente o que o painel precisa (como já é feito).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;

-- ─── Vouchers ────────────────────────────────────────────────────────────
-- Saldo nunca passa do valor comprado.
alter table public.vouchers add constraint vouchers_balance_le_amount check (balance <= amount);
-- Um pagamento da InfinitePay libera um único voucher (impede reaproveitar a transação de outra compra).
create unique index vouchers_payment_transaction_uniq on public.vouchers ((payment ->> 'transaction_nsu'))
  where payment ->> 'transaction_nsu' is not null;

-- ─── Estoque: movimentações não são editadas, só criadas ou excluídas ────
-- (o gatilho de saldo só trata INSERT/DELETE; um UPDATE desalinharia o estoque).
revoke update on public.stock_movements from authenticated;

-- ─── Agenda: pedidos do site não caem em horário bloqueado ───────────────
create or replace function private.reject_site_booking_on_block()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source = 'site' and new.status in ('solicitado', 'confirmado') and exists (
    select 1 from public.time_blocks b
    where tstzrange(b.starts_at, b.ends_at) && tstzrange(new.starts_at, new.ends_at)
  ) then
    raise exception 'horário bloqueado' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger appointments_site_not_on_block
  before insert on public.appointments
  for each row execute function private.reject_site_booking_on_block();

-- ─── Equipe: administradoras gerenciam acessos ───────────────────────────
alter table public.staff add column is_admin boolean not null default false;
-- Quem já tinha acesso mantém o poder que tinha (todas podiam criar contas).
update public.staff set is_admin = true;

-- ─── Limite de envios dos formulários públicos (usado só pelo servidor) ──
-- Guarda apenas um hash do IP/telefone, nunca o valor original.
create table public.rate_events (
  id         bigint generated always as identity primary key,
  bucket     text not null,
  key_hash   text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (bucket, key_hash, created_at desc);
create index rate_events_created_idx on public.rate_events (created_at);
alter table public.rate_events enable row level security;
revoke all on public.rate_events from anon, authenticated;
