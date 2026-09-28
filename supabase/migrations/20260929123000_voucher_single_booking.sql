-- Um voucher só pode reservar um agendamento em aberto por vez (evita uso duplo simultâneo).
create unique index if not exists appointments_voucher_open_uniq
  on public.appointments (voucher_id)
  where voucher_id is not null and status in ('solicitado', 'confirmado');
