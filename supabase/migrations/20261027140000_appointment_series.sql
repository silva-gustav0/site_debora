-- Agendamento recorrente: as sessões criadas juntas compartilham `series_id`, para cancelar a recorrência de uma vez
-- (esta sessão e as próximas em aberto). Avulsos e procedimentos opcionais ficam sem série.
alter table public.appointments add column series_id uuid;
create index appointments_series_idx on public.appointments (series_id, starts_at) where series_id is not null;
