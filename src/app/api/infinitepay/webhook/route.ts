import { createAdminClient } from "@/lib/supabase/admin";
import { activatePaidVoucher } from "@/lib/vouchers";

/**
 * Aviso de pagamento da InfinitePay. O corpo não é assinado, então ele só serve de gatilho:
 * activatePaidVoucher confirma o pagamento direto na InfinitePay antes de liberar o voucher.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const orderNsu = typeof body?.order_nsu === "string" ? body.order_nsu : "";
  const transactionNsu = typeof body?.transaction_nsu === "string" ? body.transaction_nsu : "";
  const slug = typeof body?.invoice_slug === "string" ? body.invoice_slug : typeof body?.slug === "string" ? body.slug : "";
  if (!/^[0-9a-f-]{36}$/i.test(orderNsu) || !transactionNsu || !slug) return Response.json({ ok: false }, { status: 400 });

  const db = createAdminClient();
  if (!db) return Response.json({ ok: false }, { status: 500 });
  const v = await activatePaidVoucher(db, {
    orderNsu, transactionNsu, slug, receiptUrl: typeof body?.receipt_url === "string" ? body.receipt_url : null,
  });
  // 400 faz a InfinitePay tentar de novo (ex.: pagamento ainda não confirmado na consulta).
  return Response.json({ ok: Boolean(v && v.status !== "pendente") }, { status: v && v.status !== "pendente" ? 200 : 400 });
}
