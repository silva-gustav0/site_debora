-- Contas de clientes no site (número + senha, criadas só pelo servidor) e desconto de boas-vindas.

-- Conta do site ligada à ficha (uma conta por ficha).
alter table public.clients
  add column user_id uuid unique references auth.users (id) on delete set null,
  add column welcome_discount_pct numeric(4, 1) not null default 0 check (welcome_discount_pct between 0 and 50);

-- Desconto aplicado a um atendimento (hoje só o de boas-vindas).
alter table public.appointments
  add column discount_pct numeric(4, 1) not null default 0 check (discount_pct between 0 and 50);

create index appointments_discount_idx on public.appointments (client_id) where discount_pct > 0;

-- O desconto de boas-vindas vai sozinho para um único atendimento da cliente (site, painel ou app).
-- Fica "preso" a um atendimento em aberto ou concluído; cancelado/falta devolve o desconto.
create or replace function private.welcome_discount_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare pct numeric;
begin
  select c.welcome_discount_pct into pct from public.clients c where c.id = new.client_id;
  new.discount_pct := 0;
  if coalesce(pct, 0) > 0 and new.status in ('solicitado', 'confirmado', 'concluido') and not exists (
    select 1 from public.appointments a
    where a.client_id = new.client_id and a.discount_pct > 0 and a.status in ('solicitado', 'confirmado', 'concluido')
  ) then
    new.discount_pct := pct;
  end if;
  return new;
end;
$$;

create trigger appointments_welcome_discount
  before insert on public.appointments
  for each row execute function private.welcome_discount_on_insert();

-- Cancelou ou faltou: tira o desconto deste atendimento…
create or replace function private.welcome_discount_release()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('cancelado', 'faltou') then new.discount_pct := 0; end if;
  return new;
end;
$$;

create trigger appointments_welcome_discount_release
  before update of status on public.appointments
  for each row when (old.discount_pct > 0) execute function private.welcome_discount_release();

-- …e passa para o próximo atendimento em aberto da mesma cliente, se houver.
create or replace function private.welcome_discount_move()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare pct numeric;
begin
  select c.welcome_discount_pct into pct from public.clients c where c.id = new.client_id;
  if coalesce(pct, 0) > 0 and not exists (
    select 1 from public.appointments a
    where a.client_id = new.client_id and a.discount_pct > 0 and a.status in ('solicitado', 'confirmado', 'concluido')
  ) then
    update public.appointments set discount_pct = pct
    where id = (
      select a.id from public.appointments a
      where a.client_id = new.client_id and a.status in ('solicitado', 'confirmado') and a.starts_at >= now()
      order by a.starts_at limit 1
    );
  end if;
  return null;
end;
$$;

create trigger appointments_welcome_discount_move
  after update of status on public.appointments
  for each row when (old.discount_pct > 0 and new.status in ('cancelado', 'faltou'))
  execute function private.welcome_discount_move();

revoke all on function private.welcome_discount_on_insert() from public, anon, authenticated;
revoke all on function private.welcome_discount_release() from public, anon, authenticated;
revoke all on function private.welcome_discount_move() from public, anon, authenticated;
