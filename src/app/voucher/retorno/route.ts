import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { activatePaidVoucher, voucherPath } from "@/lib/vouchers";

/** Volta do checkout da InfinitePay: confirma o pagamento (se o aviso ainda não chegou) e abre o voucher. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const orderNsu = q.get("order_nsu") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(orderNsu)) redirect("/vouchers");
  const db = createAdminClient();
  if (db) {
    await activatePaidVoucher(db, {
      orderNsu, transactionNsu: q.get("transaction_nsu") ?? "", slug: q.get("slug") ?? "", receiptUrl: q.get("receipt_url"),
    });
  }
  redirect(voucherPath({ order_nsu: orderNsu }));
}
