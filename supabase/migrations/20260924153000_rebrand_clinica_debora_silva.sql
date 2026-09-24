-- Renomeia a clínica para "Clínica Debora Silva".
-- O nome só é trocado se ainda for o padrão antigo, para não sobrescrever uma edição feita em Configurações.
alter table public.settings alter column clinic_name set default 'Clínica Debora Silva';

update public.settings
   set clinic_name = 'Clínica Debora Silva'
 where id = 1
   and clinic_name = 'Talissa Estética e Bem Estar';
