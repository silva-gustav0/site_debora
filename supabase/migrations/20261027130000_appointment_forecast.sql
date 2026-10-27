-- Financeiro previsto pela agenda: todo agendamento (site, painel ou app) entra no financeiro como receita
-- pendente ("previsão"), com vencimento no dia do atendimento. No dia, se continuar na agenda, vira pago no Pix.
-- Cancelado, falta ou removido da agenda: a previsão some do financeiro (mesmo se já tinha sido dada como paga).
-- Pagamento registrado ao concluir (qualquer forma) substitui a previsão.

alter table public.transactions add column forecast boolean not null default false;
create unique index transactions_forecast_appointment_key on public.transactions (appointment_id) where forecast;

-- ─── Valor a receber do atendimento: desconto de boas-vindas e voucher já descontados ──
create or replace function private.appointment_due_amount(a public.appointments)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    round(a.price * (1 - coalesce(a.discount_pct, 0) / 100.0), 2)
      - coalesce(
          a.voucher_amount,
          (select case when v.kind = 'servico' then a.price else least(v.balance, a.price) end
           from public.vouchers v where v.id = a.voucher_id),
          0),
    0)::numeric(10, 2);
$$;

-- ─── Mantém a previsão de cada agendamento ───────────────────────────────
create or replace function private.sync_appointment_forecast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  amt numeric(10, 2);
  day date;
  today date := (now() at time zone 'America/Sao_Paulo')::date;
  svc text;
begin
  if tg_op = 'DELETE' then
    delete from public.transactions where appointment_id = old.id and forecast;
    return old;
  end if;

  amt := private.appointment_due_amount(new);
  -- Sem previsão: cancelado/falta, sessão de pacote (pago na venda), nada a cobrar ou já pago à parte.
  if new.status not in ('solicitado', 'confirmado', 'concluido')
     or new.client_package_id is not null
     or amt <= 0
     or exists (select 1 from public.transactions t
                where t.appointment_id = new.id and t.kind = 'receita' and not t.forecast) then
    delete from public.transactions where appointment_id = new.id and forecast;
    return null;
  end if;

  day := (new.starts_at at time zone 'America/Sao_Paulo')::date;
  select s.name into svc from public.services s where s.id = new.service_id;
  insert into public.transactions (kind, category, description, amount, method, occurred_on, due_on, status, client_id, appointment_id, forecast)
  values ('receita', 'Atendimento', coalesce(svc, 'Atendimento') || ' · agendado', amt, 'pix', day, day, 'pendente', new.client_id, new.id, true)
  on conflict (appointment_id) where forecast do update
    set amount = excluded.amount, occurred_on = excluded.occurred_on, due_on = excluded.due_on,
        client_id = excluded.client_id,
        -- Remarcado para o futuro volta a ficar pendente; no passado mantém como está.
        status = case when excluded.due_on > today then 'pendente' else public.transactions.status end,
        description = case when excluded.due_on > today then excluded.description else public.transactions.description end;
  return null;
end;
$$;

create trigger appointments_forecast
  after insert or update of status, price, starts_at, discount_pct, voucher_id, voucher_amount, client_package_id, service_id, client_id
  on public.appointments
  for each row execute function private.sync_appointment_forecast();

create trigger appointments_forecast_delete
  before delete on public.appointments
  for each row execute function private.sync_appointment_forecast();

-- ─── Pagamento registrado (concluir com pagamento) substitui a previsão ──
create or replace function private.replace_appointment_forecast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.transactions where appointment_id = new.appointment_id and forecast;
  return null;
end;
$$;

create trigger transactions_replace_forecast
  after insert on public.transactions
  for each row when (new.appointment_id is not null and new.kind = 'receita' and not new.forecast)
  execute function private.replace_appointment_forecast();

-- ─── No dia do atendimento: previsão que continua na agenda vira paga no Pix ──
create or replace function private.settle_appointment_forecasts()
returns integer
language sql
security definer
set search_path = ''
as $$
  with paid as (
    update public.transactions t
    set status = 'pago', method = 'pix',
        description = regexp_replace(t.description, ' · agendado$', '') || ' · Pix (automático)'
    where t.forecast and t.status = 'pendente'
      and t.due_on <= (now() at time zone 'America/Sao_Paulo')::date
    returning 1
  )
  select count(*)::int from paid;
$$;

create extension if not exists pg_cron;
select cron.schedule('financeiro-agenda-pix', '*/30 * * * *', 'select private.settle_appointment_forecasts()');

-- ─── Agendamentos já marcados de hoje em diante entram como previstos ────
insert into public.transactions (kind, category, description, amount, method, occurred_on, due_on, status, client_id, appointment_id, forecast)
select 'receita', 'Atendimento', coalesce(s.name, 'Atendimento') || ' · agendado', private.appointment_due_amount(a), 'pix',
       (a.starts_at at time zone 'America/Sao_Paulo')::date, (a.starts_at at time zone 'America/Sao_Paulo')::date,
       'pendente', a.client_id, a.id, true
from public.appointments a
left join public.services s on s.id = a.service_id
where a.status in ('solicitado', 'confirmado')
  and (a.starts_at at time zone 'America/Sao_Paulo')::date >= (now() at time zone 'America/Sao_Paulo')::date
  and a.client_package_id is null
  and private.appointment_due_amount(a) > 0
  and not exists (select 1 from public.transactions t where t.appointment_id = a.id and t.kind = 'receita');
