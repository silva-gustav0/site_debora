-- Procedimentos opcionais no mesmo horário: a mesma cliente pode ter mais de um atendimento ao mesmo tempo
-- (ex.: limpeza de pele + máscara de LED). Entre clientes diferentes a regra continua: nada se sobrepõe.
create extension if not exists btree_gist with schema extensions;

alter table public.appointments drop constraint appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap exclude using gist (
  tstzrange(starts_at, ends_at) with &&,
  client_id extensions.gist_uuid_ops with <>
) where (status in ('solicitado', 'confirmado', 'concluido'));
