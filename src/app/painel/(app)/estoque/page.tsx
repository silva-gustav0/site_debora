import Link from "next/link";
import { AlertTriangle, ArrowDownToLine, Boxes, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { brl, fmtDate, fmtTime, METHOD_LABEL } from "@/lib/format";
import ActionForm from "@/components/painel/ActionForm";
import ConfirmButton from "@/components/painel/ConfirmButton";
import Drawer from "@/components/painel/Drawer";
import SubmitButton from "@/components/painel/SubmitButton";
import { Badge, Card, Chips, EmptyState, PageHeader, Progress, StatTile } from "@/components/painel/ui";
import { addStockMovement, deleteStockMovement, saveProduct } from "../../actions";
import type { Product, StockMovement } from "@/lib/types";

export const metadata = { title: "Estoque" };

const qtyFmt = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
const MOV_LABEL = { entrada: "Entrada", saida: "Uso / saída", venda: "Venda", ajuste: "Ajuste" } as const;

function ProductForm({ p }: { p?: Product }) {
  return (
    <ActionForm action={saveProduct} resetOnSuccess={!p} className="grid grid-cols-2 gap-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="col-span-2"><span className="p-label">Nome</span><input name="name" required defaultValue={p?.name} className="p-input" /></label>
      <label><span className="p-label">Marca</span><input name="brand" defaultValue={p?.brand ?? ""} className="p-input" /></label>
      <label>
        <span className="p-label">Uso</span>
        <select name="category" defaultValue={p?.category ?? "uso_cabine"} className="p-input">
          <option value="uso_cabine">Uso em cabine</option>
          <option value="home_care">Home care (revenda)</option>
        </select>
      </label>
      <label><span className="p-label">Unidade</span><input name="unit" defaultValue={p?.unit ?? "un"} placeholder="un, ml, g" className="p-input" /></label>
      <label><span className="p-label">Estoque mínimo</span><input name="min_qty" inputMode="decimal" defaultValue={p ? qtyFmt(Number(p.min_qty)) : "1"} className="p-input p-num" /></label>
      <label><span className="p-label">Custo (R$)</span><input name="cost_price" inputMode="decimal" defaultValue={p ? String(p.cost_price).replace(".", ",") : ""} className="p-input p-num" /></label>
      <label><span className="p-label">Preço de venda (R$)</span><input name="sale_price" inputMode="decimal" defaultValue={p ? String(p.sale_price).replace(".", ",") : ""} className="p-input p-num" /></label>
      {!p && <label className="col-span-2"><span className="p-label">Quantidade inicial</span><input name="initial_qty" inputMode="decimal" className="p-input p-num" /></label>}
      {p && (
        <label className="col-span-2 flex items-center gap-2 text-sm text-[#6B4C52]">
          <input type="checkbox" name="active" defaultChecked={p.active} className="accent-[#A85B63]" /> Produto ativo
        </label>
      )}
      <div className="col-span-2"><SubmitButton>{p ? "Salvar produto" : "Cadastrar produto"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function StockPage({ searchParams }: PageProps<"/painel/estoque">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const filter = ["todos", "baixo", "cabine", "home"].includes(String(sp.f)) ? String(sp.f) : "todos";
  const productId = typeof sp.p === "string" ? sp.p : null;

  const [productsRes, movRes, clientsRes] = await Promise.all([
    supabase.from("products").select("*").order("active", { ascending: false }).order("name"),
    productId
      ? supabase.from("stock_movements").select("*, clients(name)").eq("product_id", productId).order("created_at", { ascending: false }).limit(50)
      : supabase.from("stock_movements").select("*, products(name, unit), clients(name)").order("created_at", { ascending: false }).limit(12),
    productId ? supabase.from("clients").select("id, name").order("name") : Promise.resolve({ data: [] }),
  ]);
  const products = (productsRes.data ?? []) as Product[];
  const movements = (movRes.data ?? []) as (StockMovement & { products?: { name: string; unit: string }; clients: { name: string } | null })[];
  const low = products.filter((p) => p.active && Number(p.min_qty) > 0 && Number(p.stock_qty) <= Number(p.min_qty));
  const stockValue = products.reduce((s, p) => s + Math.max(Number(p.stock_qty), 0) * Number(p.cost_price), 0);
  const saleValue = products.filter((p) => p.category === "home_care").reduce((s, p) => s + Math.max(Number(p.stock_qty), 0) * Number(p.sale_price), 0);
  const list = products.filter((p) =>
    filter === "baixo" ? low.includes(p) : filter === "cabine" ? p.category === "uso_cabine" : filter === "home" ? p.category === "home_care" : true,
  );
  const selected = productId ? products.find((p) => p.id === productId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Estoque"
        subtitle="Produtos de cabine e home care, com alerta de reposição e vendas."
        actions={<Link href="/painel/estoque?novo=1" scroll={false} className="p-btn"><Plus size={14} /> Novo produto</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Produtos ativos" value={products.filter((p) => p.active).length} icon={Boxes} />
        <StatTile label="Abaixo do mínimo" value={low.length} tone={low.length ? "warn" : "default"} icon={AlertTriangle} href="/painel/estoque?f=baixo" />
        <StatTile label="Valor em estoque" value={brl(stockValue)} hint="a preço de custo" />
        <StatTile label="Potencial de revenda" value={brl(saleValue)} hint="home care a preço de venda" icon={ShoppingBag} />
      </div>

      <div className="grid xl:grid-cols-[1fr_340px] gap-5">
        <Card bodyClassName="p-0 overflow-x-auto">
          <div className="px-5 py-3 border-b border-[#F6ECE9]">
            <Chips
              current={filter}
              items={[
                { key: "todos", label: "Todos", href: "/painel/estoque" },
                { key: "baixo", label: `Repor · ${low.length}`, href: "/painel/estoque?f=baixo" },
                { key: "cabine", label: "Cabine", href: "/painel/estoque?f=cabine" },
                { key: "home", label: "Home care", href: "/painel/estoque?f=home" },
              ]}
            />
          </div>
          {list.length === 0 ? <EmptyState icon={Boxes}>Nenhum produto aqui.</EmptyState> : (
            <table className="p-table">
              <thead><tr><th>Produto</th><th>Uso</th><th className="text-right">Estoque</th><th className="w-40">Nível</th><th className="text-right">Custo</th><th className="text-right">Venda</th><th /></tr></thead>
              <tbody>
                {list.map((p) => {
                  const qty = Number(p.stock_qty), min = Number(p.min_qty);
                  const isLow = min > 0 && qty <= min;
                  return (
                    <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                      <td>
                        <Link href={`/painel/estoque?p=${p.id}`} scroll={false} className="font-bold text-[#2C1A1E] hover:text-[#8B3A42]">{p.name}</Link>
                        {p.brand && <span className="block text-xs text-[#8F7479]">{p.brand}</span>}
                      </td>
                      <td>{p.category === "home_care" ? <Badge tone="plum">home care</Badge> : <Badge tone="gray">cabine</Badge>}</td>
                      <td className={`text-right p-num font-bold ${isLow ? "text-[#9B2C2C]" : ""}`}>{qtyFmt(qty)} {p.unit}</td>
                      <td>
                        <Progress value={qty} max={Math.max(min * 3, qty, 1)} color={isLow ? "#C0504D" : "#3F9A5E"} />
                        <span className="text-[10.5px] text-[#8F7479]">mín. {qtyFmt(min)}</span>
                      </td>
                      <td className="text-right p-num">{brl(p.cost_price)}</td>
                      <td className="text-right p-num">{Number(p.sale_price) ? brl(p.sale_price) : "—"}</td>
                      <td className="text-right"><Link href={`/painel/estoque?p=${p.id}`} scroll={false} className="p-btn-ghost p-btn-sm">Movimentar</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Últimas movimentações" bodyClassName="p-3">
          {!productId && movements.length === 0 ? <EmptyState icon={ArrowDownToLine}>Sem movimentações.</EmptyState> : !productId && (
            <ul className="flex flex-col divide-y divide-[#F6ECE9]">
              {movements.map((m) => (
                <li key={m.id} className="py-2 px-1 flex items-center gap-2 text-sm">
                  <span className={`p-num font-bold w-14 text-right ${Number(m.qty) > 0 ? "text-[#1F6B3A]" : "text-[#9B2C2C]"}`}>{Number(m.qty) > 0 ? "+" : ""}{qtyFmt(Number(m.qty))}</span>
                  <span className="flex-1 min-w-0 truncate">{m.products?.name}<span className="block text-xs text-[#8F7479]">{MOV_LABEL[m.kind]} · {fmtDate(m.created_at, { year: undefined })}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {sp.novo === "1" && (
        <Drawer title="Novo produto" eyebrow="Estoque" closeHref="/painel/estoque"><ProductForm /></Drawer>
      )}

      {selected && (
        <Drawer title={selected.name} eyebrow={`Estoque atual: ${qtyFmt(Number(selected.stock_qty))} ${selected.unit}`} closeHref="/painel/estoque">
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-[#EFE2DE] bg-white p-4">
              <p className="p-display text-xl mb-3">Movimentar</p>
              <ActionForm action={addStockMovement} resetOnSuccess className="grid grid-cols-2 gap-3">
                <input type="hidden" name="product_id" value={selected.id} />
                <label>
                  <span className="p-label">Tipo</span>
                  <select name="kind" defaultValue="saida" className="p-input">
                    <option value="entrada">Entrada (compra)</option>
                    <option value="saida">Uso em cabine</option>
                    <option value="venda">Venda para cliente</option>
                    <option value="ajuste">Ajuste (contagem)</option>
                  </select>
                </label>
                <label><span className="p-label">Quantidade</span><input name="qty" required inputMode="decimal" className="p-input p-num" placeholder={`em ${selected.unit}`} /></label>
                <label><span className="p-label">Custo unitário (entrada)</span><input name="unit_cost" inputMode="decimal" defaultValue={String(selected.cost_price).replace(".", ",")} className="p-input p-num" /></label>
                <label><span className="p-label">Preço unitário (venda)</span><input name="unit_price" inputMode="decimal" defaultValue={String(selected.sale_price).replace(".", ",")} className="p-input p-num" /></label>
                <label>
                  <span className="p-label">Cliente (venda)</span>
                  <select name="client_id" defaultValue="" className="p-input">
                    <option value="">—</option>
                    {(clientsRes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="p-label">Forma de pagamento</span>
                  <select name="method" defaultValue="pix" className="p-input">{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="col-span-2"><span className="p-label">Observação</span><input name="note" className="p-input" /></label>
                <label className="col-span-2 flex items-center gap-2 text-sm text-[#6B4C52]">
                  <input type="checkbox" name="register_expense" defaultChecked className="accent-[#A85B63]" /> Na entrada, lançar a compra como despesa
                </label>
                <p className="col-span-2 text-[11px] text-[#8F7479]">Vendas geram receita automaticamente no financeiro. No ajuste, informe a quantidade contada.</p>
                <div className="col-span-2"><SubmitButton>Registrar</SubmitButton></div>
              </ActionForm>
            </section>

            <section>
              <p className="p-display text-xl mb-2">Histórico</p>
              {movements.length === 0 ? <p className="text-sm text-[#8F7479]">Sem movimentações.</p> : (
                <ul className="flex flex-col divide-y divide-[#F6ECE9]">
                  {movements.map((m) => (
                    <li key={m.id} className="py-2 flex items-center gap-3 text-sm">
                      <span className={`p-num font-bold w-16 text-right ${Number(m.qty) > 0 ? "text-[#1F6B3A]" : "text-[#9B2C2C]"}`}>{Number(m.qty) > 0 ? "+" : ""}{qtyFmt(Number(m.qty))}</span>
                      <span className="flex-1 min-w-0">
                        {MOV_LABEL[m.kind]}{m.clients && ` · ${m.clients.name}`}
                        <span className="block text-xs text-[#8F7479]">{fmtDate(m.created_at)} {fmtTime(m.created_at)}{m.note && ` · ${m.note}`}</span>
                      </span>
                      <form action={deleteStockMovement}>
                        <input type="hidden" name="id" value={m.id} />
                        <ConfirmButton confirmText="Desfazer"><Trash2 size={12} /></ConfirmButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[#EFE2DE] bg-white p-4">
              <p className="p-display text-xl mb-3">Dados do produto</p>
              <ProductForm p={selected} />
            </section>
          </div>
        </Drawer>
      )}
    </>
  );
}
