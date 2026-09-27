-- Links de anamnese: cada link é único, ligado a um agendamento/cliente e expira em 2 horas.
-- O cliente preenche sem login; o site valida o token pelo servidor (service role).
create table public.anamnesis_links (
  token          uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  client_id      uuid not null references public.clients (id) on delete cascade,
  expires_at     timestamptz not null default now() + interval '2 hours',
  submitted_at   timestamptz,
  revoked_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index anamnesis_links_appointment_idx on public.anamnesis_links (appointment_id, created_at desc);
create index anamnesis_links_client_idx on public.anamnesis_links (client_id);

alter table public.anamnesis_links enable row level security;
create policy "staff manages anamnesis_links" on public.anamnesis_links
  for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

revoke all on public.anamnesis_links from anon, authenticated;
grant select, insert, update, delete on public.anamnesis_links to authenticated;
grant all on public.anamnesis_links to service_role;
