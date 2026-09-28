-- Quanto do atendimento foi coberto pelo voucher (gravado ao concluir; evita descontar o saldo duas vezes).
alter table public.appointments add column if not exists voucher_amount numeric(10, 2) check (voucher_amount >= 0);
