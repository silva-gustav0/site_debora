-- Aviso fixo de promoção no site: um cartão flutuante que a visitante pode fechar.
-- Só uma promoção por vez ocupa o aviso (igual ao cartão do topo).
alter table public.promotions add column if not exists show_as_notice boolean not null default false;
alter table public.promotions add column if not exists notice_text text check (char_length(notice_text) <= 160);
