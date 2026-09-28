-- Tempo real no painel: o app da equipe é avisado de qualquer mudança (inclusive
-- agendamentos feitos pelo site) e atualiza a tela na hora. O RLS continua valendo:
-- só a equipe recebe os eventos.
do $$
declare t text;
begin
  foreach t in array array[
    'services', 'clients', 'appointments', 'transactions', 'interactions', 'settings', 'time_blocks',
    'packages', 'client_packages', 'session_records', 'client_photos', 'products', 'stock_movements',
    'site_content', 'promotions', 'blog_posts', 'anamnesis_links'
  ] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
