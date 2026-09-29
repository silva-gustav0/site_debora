-- Regras de negócio no banco (base do app offline).
-- O que antes só o painel web fazia agora vale para qualquer origem (site, painel web, app):
-- efeitos automáticos viram gatilhos, e o app envia suas alterações em lote por apply_changes().

-- ─── Agendamento: pacote precisa ser da cliente, do serviço e ter saldo ──
create or replace function private.check_appointment_package()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pkg record;
  used int;
begin
  if new.client_package_id is null
     or (tg_op = 'UPDATE' and new.client_package_id is not distinct from old.client_package_id
         and new.status is not distinct from old.status) then
    return new;
  end if;
  if new.status not in ('solicitado', 'confirmado', 'concluido') then
    return new;
  end if;

  select cp.client_id, cp.service_id, cp.status, cp.sessions_total into pkg
  from public.client_packages cp where cp.id = new.client_package_id;
  if not found or pkg.client_id <> new.client_id then
    raise exception 'Pacote inválido para esta cliente.' using errcode = 'P0001';
  end if;
  if pkg.service_id <> new.service_id then
    raise exception 'O pacote escolhido é de outro serviço.' using errcode = 'P0001';
  end if;
  if pkg.status <> 'ativo' and (tg_op = 'INSERT' or old.client_package_id is distinct from new.client_package_id) then
    raise exception 'Este pacote não está ativo.' using errcode = 'P0001';
  end if;

  select count(*) into used from public.appointments a
  where a.client_package_id = new.client_package_id and a.id <> new.id
    and a.status in ('solicitado', 'confirmado', 'concluido');
  if used >= pkg.sessions_total then
    raise exception 'Este pacote não tem sessões disponíveis.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger appointments_check_package
  before insert or update on public.appointments
  for each row execute function private.check_appointment_package();

-- ─── Concluir com voucher: desconta uma única vez (mesmo reabrindo e concluindo de novo) ──
create or replace function private.apply_voucher_on_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v record;
  covered numeric(10, 2);
  new_balance numeric(10, 2);
begin
  if new.status <> 'concluido' or old.status = 'concluido'
     or new.voucher_id is null or new.voucher_amount is not null then
    return new;
  end if;

  select id, kind, balance into v from public.vouchers where id = new.voucher_id for update;
  if not found then
    return new;
  end if;
  covered := case when v.kind = 'servico' then new.price else least(v.balance, new.price) end;
  new_balance := case when v.kind = 'servico' then 0 else greatest(v.balance - covered, 0) end;
  new.voucher_amount := covered;

  update public.vouchers
  set balance = new_balance,
      status = case when new_balance = 0 then 'usado' else status end,
      used_at = case when new_balance = 0 then now() else used_at end
  where id = v.id;
  return new;
end;
$$;

create trigger appointments_apply_voucher
  before update of status on public.appointments
  for each row execute function private.apply_voucher_on_complete();

-- ─── Efeitos depois de agendar/concluir: estágio da cliente e pacote encerrado ──
create or replace function private.after_appointment_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining int;
begin
  if tg_op = 'INSERT' and new.source = 'painel' then
    update public.clients set stage = 'em_contato' where id = new.client_id and stage = 'lead';
  end if;

  if new.status = 'concluido' and (tg_op = 'INSERT' or old.status <> 'concluido') then
    update public.clients set stage = 'cliente'
    where id = new.client_id and stage in ('lead', 'em_contato', 'inativa');

    if new.client_package_id is not null then
      select cp.sessions_total - count(a.id) filter (where a.status = 'concluido') into remaining
      from public.client_packages cp
      left join public.appointments a on a.client_package_id = cp.id
      where cp.id = new.client_package_id
      group by cp.id;
      if remaining is not null and remaining <= 0 then
        update public.client_packages set status = 'concluido' where id = new.client_package_id and status = 'ativo';
      end if;
    end if;
  end if;
  return null;
end;
$$;

create trigger appointments_after_change
  after insert or update of status on public.appointments
  for each row execute function private.after_appointment_change();

-- ─── Venda de pacote: a cliente passa a ser "cliente" ────────────────────
create or replace function private.after_client_package_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.clients set stage = 'cliente'
  where id = new.client_id and stage in ('lead', 'em_contato', 'inativa');
  return null;
end;
$$;

create trigger client_packages_after_insert
  after insert on public.client_packages
  for each row execute function private.after_client_package_insert();

-- ─── Voucher reservado por um agendamento em aberto não pode ser cancelado ──
create or replace function private.check_voucher_cancel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelado' and old.status <> 'cancelado' then
    if old.status not in ('ativo', 'pendente') then
      raise exception 'Só vouchers disponíveis podem ser cancelados.' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.appointments a
               where a.voucher_id = new.id and a.status in ('solicitado', 'confirmado')) then
      raise exception 'Este voucher está reservado por um agendamento.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger vouchers_check_cancel
  before update of status on public.vouchers
  for each row execute function private.check_voucher_cancel();

-- ─── apply_changes: aplica, numa única transação, o lote de alterações feitas no app ──
-- Recebe [{ "op": "PUT"|"PATCH"|"DELETE", "table": "...", "id": "...", "data": {...} }].
-- Roda com as permissões de quem chama (RLS: só a equipe). Só aceita tabelas e colunas conhecidas;
-- colunas calculadas pelo servidor são ignoradas. Qualquer erro desfaz o lote inteiro.
create or replace function public.apply_changes(ops jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  op jsonb;
  t text;
  kind text;
  row_id text;
  data jsonb;
  ins_cols text[];
  upd_cols text[];
  -- Calculadas pelo servidor: o app nunca grava (saldo de estoque, valor coberto pelo voucher, token, autoria).
  never constant text[] := array[
    'products.stock_qty', 'appointments.voucher_amount', 'appointments.public_token',
    'vouchers.used_at', 'vouchers.order_nsu', 'interactions.created_by', 'session_records.created_by'
  ];
  -- Definidas ao criar, depois só o servidor muda (saldo do voucher, dados do pagamento).
  create_only constant text[] := array['vouchers.balance', 'vouchers.payment', 'vouchers.code'];
  allowed constant text[] := array[
    'clients', 'appointments', 'time_blocks', 'session_records', 'client_photos', 'interactions',
    'packages', 'client_packages', 'products', 'stock_movements', 'transactions', 'services',
    'settings', 'vouchers'
  ];
begin
  if not coalesce((select private.is_staff()), false) then
    raise exception 'Sem acesso ao painel.' using errcode = '42501';
  end if;
  if jsonb_typeof(ops) <> 'array' then
    raise exception 'Formato inválido.' using errcode = '22023';
  end if;

  for op in select value from jsonb_array_elements(ops) loop
    t := op ->> 'table';
    kind := op ->> 'op';
    row_id := op ->> 'id';
    data := coalesce(op -> 'data', '{}'::jsonb);
    if not (t = any (allowed)) then
      raise exception 'Tabela não sincronizável: %', t using errcode = '42501';
    end if;
    if row_id is null or kind not in ('PUT', 'PATCH', 'DELETE') then
      raise exception 'Operação inválida.' using errcode = '22023';
    end if;

    if kind = 'DELETE' then
      execute format('delete from public.%I where id::text = $1', t) using row_id;
      continue;
    end if;

    -- Só colunas enviadas que existem e não são geradas pelo banco.
    select coalesce(array_agg(c.column_name::text order by c.ordinal_position), '{}') into ins_cols
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = t
      and c.column_name <> 'id'
      and c.is_generated = 'NEVER' and c.is_identity = 'NO'
      and data ? c.column_name
      and not ((t || '.' || c.column_name) = any (never));
    select coalesce(array_agg(c), '{}') into upd_cols
    from unnest(ins_cols) c where not ((t || '.' || c) = any (create_only));

    if kind = 'PUT' then
      execute format(
        'insert into public.%1$I (id%2$s) select r.id%3$s from jsonb_populate_record(null::public.%1$I, $1) r
         on conflict (id) do %4$s',
        t,
        (select coalesce(string_agg(format(', %I', c), ''), '') from unnest(ins_cols) c),
        (select coalesce(string_agg(format(', r.%I', c), ''), '') from unnest(ins_cols) c),
        -- Tabelas sem permissão de edição (ex.: movimentações de estoque) só aceitam criar.
        case when cardinality(upd_cols) = 0 or not has_table_privilege(format('public.%I', t), 'UPDATE') then 'nothing'
             else 'update set ' || (select string_agg(format('%1$I = excluded.%1$I', c), ', ') from unnest(upd_cols) c) end
      ) using data || jsonb_build_object('id', row_id);
    elsif cardinality(upd_cols) > 0 then
      execute format(
        'update public.%1$I t set %2$s from jsonb_populate_record(null::public.%1$I, $1) r where t.id::text = $2',
        t,
        (select string_agg(format('%1$I = r.%1$I', c), ', ') from unnest(upd_cols) c)
      ) using data, row_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.apply_changes(jsonb) from public, anon;
grant execute on function public.apply_changes(jsonb) to authenticated;
