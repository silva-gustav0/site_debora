import type { Metadata } from "next";
import Sidebar from "@/components/painel/Sidebar";
import { requireStaff } from "@/lib/dal";
import { todaySP } from "@/lib/format";

export const metadata: Metadata = {
  title: { default: "Painel · Debora Silva", template: "%s · Painel Debora Silva" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, staff } = await requireStaff();
  const today = todaySP();

  const [pending, products, bills] = await Promise.all([
    supabase.from("appointments").select("id", { count: "exact", head: true })
      .eq("status", "solicitado").gte("starts_at", new Date().toISOString()),
    supabase.from("products").select("stock_qty, min_qty").eq("active", true),
    supabase.from("transactions").select("id", { count: "exact", head: true })
      .eq("status", "pendente").lte("due_on", today),
  ]);
  const lowStock = (products.data ?? []).filter((p) => Number(p.stock_qty) <= Number(p.min_qty) && Number(p.min_qty) > 0).length;

  return (
    <div className="panel-root">
      <Sidebar name={staff.name} badges={{ agenda: pending.count ?? 0, estoque: lowStock, financeiro: bills.count ?? 0 }} />
      <main className="lg:pl-64">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-9">{children}</div>
      </main>
    </div>
  );
}
