-- PowerSync lê as mudanças do banco pela replicação lógica, através desta publicação.
-- Só as tabelas que o app sincroniza (nada do site público, limites de envio ou links de anamnese).
-- O usuário de replicação (com senha) é criado à parte no SQL Editor, para a senha não ficar no repositório.
create publication powersync for table
  public.clients, public.appointments, public.services, public.time_blocks, public.session_records,
  public.client_photos, public.interactions, public.packages, public.client_packages, public.products,
  public.stock_movements, public.transactions, public.vouchers, public.settings, public.staff;
