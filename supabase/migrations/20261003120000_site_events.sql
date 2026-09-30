-- O que as visitantes olham no site (anônimo: sessão aleatória da aba, sem IP, nome ou telefone).
-- Gravado só pelo servidor (/api/eventos); a equipe lê nos Relatórios.
create table public.site_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session    text not null check (length(session) between 8 and 40),
  kind       text not null check (kind in ('visita', 'servico', 'promocao', 'secao', 'whatsapp')),
  target     text check (length(target) <= 120),
  path       text check (length(path) <= 200)
);
create index site_events_created_idx on public.site_events (created_at);

alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant select on public.site_events to authenticated;

create policy "staff reads site events" on public.site_events
  for select to authenticated
  using ((select private.is_staff()));
