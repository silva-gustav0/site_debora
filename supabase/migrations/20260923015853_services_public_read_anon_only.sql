-- A equipe já lê serviços pela policy "staff manages services";
-- a leitura pública fica restrita ao papel anon (evita duas policies permissivas).
drop policy "public can read active services" on public.services;

create policy "public can read active services" on public.services
  for select to anon
  using (active);
