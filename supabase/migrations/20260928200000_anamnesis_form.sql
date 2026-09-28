-- Ficha de anamnese e termo de consentimento editáveis pela equipe.
-- null = usa o modelo padrão do código (as perguntas de sempre).
alter table public.settings add column if not exists anamnesis_form jsonb;
alter table public.settings add column if not exists consent_text text check (char_length(consent_text) <= 8000);
