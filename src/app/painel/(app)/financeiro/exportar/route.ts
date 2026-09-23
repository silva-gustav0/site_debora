import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/dal";
import { csvResponse, toCsv } from "@/lib/csv";
import { fmtDate, lastDayOfMonth, METHOD_LABEL, todaySP } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { supabase } = await requireStaff();
  const m = req.nextUrl.searchParams.get("m");
  const ym = m && /^\d{4}-\d{2}$/.test(m) ? m : todaySP().slice(0, 7);
  const { data } = await supabase
    .from("transactions")
    .select("*, clients(name)")
    .gte("occurred_on", `${ym}-01`)
    .lte("occurred_on", lastDayOfMonth(ym))
    .order("occurred_on");

  const body = toCsv(
    ["Data", "Tipo", "Situação", "Categoria", "Descrição", "Cliente", "Forma", "Valor", "Taxa", "Líquido", "Vencimento"],
    (data ?? []).map((t) => [
      fmtDate(t.occurred_on), t.kind === "receita" ? "Receita" : "Despesa", t.status === "pago" ? "Pago" : "Pendente",
      t.category, t.description, (t.clients as { name: string } | null)?.name, METHOD_LABEL[t.method as PaymentMethod],
      Number(t.amount), Number(t.fee), Number(t.amount) - Number(t.fee), t.due_on ? fmtDate(t.due_on) : "",
    ]),
  );
  return csvResponse(`financeiro-${ym}.csv`, body);
}
