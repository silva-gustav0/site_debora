-- Renomeia a clínica para "Clínica Débora Silva".
-- O nome só é trocado se ainda for o padrão antigo, para não sobrescrever uma edição feita em Configurações.
alter table public.settings alter column clinic_name set default 'Clínica Débora Silva';

update public.settings
   set clinic_name = 'Clínica Débora Silva'
 where id = 1
   and clinic_name = 'Talissa Estética e Bem Estar';
