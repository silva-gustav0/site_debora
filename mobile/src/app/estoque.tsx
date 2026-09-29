import { useQuery } from "@powersync/react-native";
import { brl, fmtDate, fmtTime, todaySP } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import { AlertTriangle, ArrowDownToLine, Boxes, Plus, ShoppingBag } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { DataTable, Progress, Split } from "@/components/charts";
import { Badge, Button, Card, ConfirmButton, Empty, Field, ListItem, MoneyField, moneyText, parseMoney, Row, Screen, Segmented, Select, Sheet, Stat, Toggle, useToast, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { asBool, useSettings } from "@/db/hooks";
import { newId, write } from "@/db/write";
import { METHOD_OPTIONS, qtyFmt, sum } from "@/lib/finance";

type Product = { id: string; name: string; brand: string | null; category: string; unit: string; stock_qty: number; min_qty: number; cost_price: number; sale_price: number; active: number };
type Mov = { id: string; product_id: string; kind: string; qty: number; unit_cost: number | null; note: string | null; created_at: string; product_name: string | null; unit: string | null; client_name: string | null };
const MOV_LABEL = { entrada: "Entrada", saida: "Uso / saída", venda: "Venda", ajuste: "Ajuste" } as const;
type Kind = keyof typeof MOV_LABEL;
const FILTERS = [{ value: "todos", label: "Todos" }, { value: "baixo", label: "Repor" }, { value: "cabine", label: "Cabine" }, { value: "home", label: "Home care" }];
const NEW_PRODUCT = { id: "", name: "", brand: "", category: "uso_cabine", unit: "un", min: "1", cost: "", sale: "", initial: "", active: true };
const NEW_MOV = { product: null as Product | null, kind: "entrada" as Kind, qty: "", cost: "", price: "", note: "", expense: false, method: "pix", client: null as string | null };

/** Estoque: produtos, alerta de mínimo, movimentações e histórico. */
export default function Estoque() {
  const toast = useToast();
  const wide = useWide();
  const settings = useSettings();
  const [filter, setFilter] = useState("todos");
  const [prod, setProd] = useState<typeof NEW_PRODUCT | null>(null);
  const [mov, setMov] = useState<typeof NEW_MOV | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: products } = useQuery<Product>("select * from products order by active desc, name");
  const { data: moves } = useQuery<Mov>(
    "select m.*, p.name as product_name, p.unit, c.name as client_name from stock_movements m left join products p on p.id = m.product_id left join clients c on c.id = m.client_id order by m.created_at desc limit 30",
  );
  const { data: clients } = useQuery<{ id: string; name: string }>("select id, name from clients order by name");
  const low = (p: Product) => asBool(p.active) && p.stock_qty <= p.min_qty;
  const shown = products.filter((p) => filter === "baixo" ? low(p) : filter === "cabine" ? p.category === "uso_cabine" : filter === "home" ? p.category === "home_care" : true);
  const setP = (patch: Partial<typeof NEW_PRODUCT>) => setProd((f) => f && { ...f, ...patch });
  const setM = (patch: Partial<typeof NEW_MOV>) => setMov((f) => f && { ...f, ...patch });
  const open = <T,>(set: (v: T) => void, v: T) => { setError(null); set(v); };

  const saveProduct = async () => {
    if (!prod) return;
    if (prod.name.trim().length < 2) return setError("Informe o nome do produto.");
    const num = (v: string) => Math.max(parseMoney(v) || 0, 0);
    const row = { name: prod.name.trim(), brand: prod.brand.trim() || null, category: prod.category, unit: prod.unit.trim() || "un", min_qty: num(prod.min), cost_price: num(prod.cost), sale_price: num(prod.sale), active: prod.id ? prod.active : true };
    const initial = parseMoney(prod.initial);
    await write(async (w) => {
      if (prod.id) return w.update("products", prod.id, row);
      const id = newId();
      const qty = Number.isFinite(initial) && initial > 0 ? initial : 0;
      await w.insert("products", { ...row, id, stock_qty: qty, created_at: new Date().toISOString() });
      if (qty) await w.insert("stock_movements", { product_id: id, kind: "entrada", qty, unit_cost: row.cost_price, note: "Estoque inicial", created_at: new Date().toISOString() });
    });
    toast(prod.id ? "Produto atualizado." : "Produto cadastrado.");
    setProd(null);
  };

  const saveMovement = async () => {
    if (!mov?.product) return;
    const { product: p, kind } = mov;
    const qty = parseMoney(mov.qty);
    if (!Number.isFinite(qty) || (kind !== "ajuste" && qty <= 0) || (kind === "ajuste" && qty < 0)) return setError("Informe a quantidade.");
    const delta = kind === "entrada" ? qty : kind === "ajuste" ? qty - p.stock_qty : -qty;
    if (delta === 0) return setError("O estoque já está com essa quantidade.");
    const unitCost = parseMoney(mov.cost);
    const now = new Date().toISOString();
    await write(async (w) => {
      const id = await w.insert("stock_movements", { product_id: p.id, kind, qty: delta, unit_cost: Number.isFinite(unitCost) ? unitCost : null, note: mov.note.trim() || null, client_id: mov.client, created_at: now });
      const patch: Record<string, number> = { stock_qty: p.stock_qty + delta };
      const tx = { occurred_on: todaySP(), status: "pago", stock_movement_id: id, method: mov.method, created_at: now };
      if (kind === "entrada" && unitCost > 0) {
        patch.cost_price = unitCost;
        if (mov.expense) await w.insert("transactions", { ...tx, kind: "despesa", category: "Produtos e insumos", description: `Compra: ${p.name}`, amount: Math.round(unitCost * qty * 100) / 100, fee: 0 });
      }
      const amount = Math.round((Number.isFinite(parseMoney(mov.price)) ? parseMoney(mov.price) : p.sale_price) * qty * 100) / 100;
      if (kind === "venda" && amount > 0) {
        await w.insert("transactions", { ...tx, kind: "receita", category: "Venda de produtos", description: `${qty}× ${p.name}`, amount, fee: cardFee(settings, mov.method, amount), client_id: mov.client });
      }
      await w.update("products", p.id, patch);
    });
    toast("Movimentação registrada.");
    setMov(null);
  };

  const removeMove = (m: Mov) => write(async (w) => {
    await w.remove("stock_movements", m.id);
    const p = await w.get<{ stock_qty: number }>("select stock_qty from products where id = ?", [m.product_id]);
    if (p) await w.update("products", m.product_id, { stock_qty: p.stock_qty - m.qty });
  });

  const editProduct = (p: Product) => open(setProd, { id: p.id, name: p.name, brand: p.brand ?? "", category: p.category, unit: p.unit, min: qtyFmt(p.min_qty), cost: moneyText(p.cost_price), sale: moneyText(p.sale_price), initial: "", active: asBool(p.active) });

  const t = (size: number, color: string, bold?: boolean) => ({ fontSize: size, color, fontFamily: bold ? Font.bold : Font.body });
  const move = (p: Product) => open(setMov, { ...NEW_MOV, product: p, price: moneyText(p.sale_price), cost: moneyText(p.cost_price) });
  const lowCount = products.filter(low).length;

  return (
    <Screen
      eyebrow="Gestão" title="Estoque" subtitle="Produtos de cabine e home care, com alerta de reposição e vendas." back
      right={<Button small icon={Plus} onPress={() => open(setProd, { ...NEW_PRODUCT })}>Novo produto</Button>}
    >
      <Row wrap gap={12}>
        <Stat icon={Boxes} label="Produtos ativos" value={String(products.filter((p) => asBool(p.active)).length)} />
        <Stat icon={AlertTriangle} label="Abaixo do mínimo" value={String(lowCount)} tone={lowCount ? "red" : "bronze"} />
        <Stat label="Valor em estoque" value={brl(sum(products, (p) => Math.max(p.stock_qty, 0) * p.cost_price))} hint="a preço de custo" />
        <Stat icon={ShoppingBag} label="Potencial de revenda" value={brl(sum(products.filter((p) => p.category === "home_care"), (p) => Math.max(p.stock_qty, 0) * p.sale_price))} hint="home care a preço de venda" />
      </Row>
      <Split
        ratio={2}
        left={
          <Card bodyStyle={{ padding: 0, gap: 0 }}>
            <View style={{ padding: 16 }}><Segmented value={filter} options={FILTERS.map((f) => ({ ...f, label: f.value === "baixo" ? `Repor · ${lowCount}` : f.label }))} onChange={setFilter} /></View>
            {shown.length === 0 ? <Empty icon={Boxes} text="Nenhum produto aqui." /> : wide ? (
              <DataTable
                cols={[{ label: "Produto", flex: 2 }, { label: "Uso" }, { label: "Estoque", right: true }, { label: "Nível", flex: 1.2 }, { label: "Custo", right: true }, { label: "Venda", right: true }, { label: "", flex: 1.3, right: true }]}
                rows={shown.map((p) => ({
                  key: p.id, onPress: () => editProduct(p), dim: !asBool(p.active),
                  cells: [
                    <View key="n"><Text style={t(14, Brand.ink, true)} numberOfLines={1}>{p.name}</Text>{!!p.brand && <Text style={t(12, Brand.muted)}>{p.brand}</Text>}</View>,
                    <Badge key="u" tone={p.category === "home_care" ? "plum" : "gray"}>{p.category === "home_care" ? "home care" : "cabine"}</Badge>,
                    <Text key="q" style={t(14, low(p) ? Brand.danger : Brand.ink, true)}>{`${qtyFmt(p.stock_qty)} ${p.unit}`}</Text>,
                    <View key="l" style={{ width: "100%", gap: 2 }}><Progress value={p.stock_qty} max={Math.max(p.min_qty * 3, p.stock_qty, 1)} color={low(p) ? "#C0504D" : "#3F9A5E"} /><Text style={t(10.5, Brand.muted)}>{`mín. ${qtyFmt(p.min_qty)}`}</Text></View>,
                    brl(p.cost_price), p.sale_price ? brl(p.sale_price) : "—",
                    <Button key="m" small variant="ghost" onPress={() => move(p)}>Movimentar</Button>,
                  ],
                }))}
              />
            ) : shown.map((p) => (
              <ListItem
                key={p.id} title={p.name} onPress={() => editProduct(p)}
                subtitle={`${[p.brand, p.category === "home_care" ? "Home care" : "Cabine"].filter(Boolean).join(" · ")} · mínimo ${qtyFmt(p.min_qty)} ${p.unit}`}
                right={<Row><Badge tone={low(p) ? "red" : "green"}>{`${qtyFmt(p.stock_qty)} ${p.unit}`}</Badge><Button small variant="outline" onPress={() => move(p)}>Movimentar</Button></Row>}
              />
            ))}
          </Card>
        }
        right={
          <Card title="Últimas movimentações" bodyStyle={{ padding: 12, gap: 0 }}>
            {moves.length === 0 ? <Empty icon={ArrowDownToLine} text="Sem movimentações." /> : moves.map((m) => (
              <Row key={m.id} style={{ paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft }}>
                <Text style={[t(14, m.qty > 0 ? "#1F6B3A" : Brand.danger, true), { width: 56, textAlign: "right", fontVariant: ["tabular-nums"] }]}>{`${m.qty > 0 ? "+" : ""}${qtyFmt(m.qty)}`}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={t(14, Brand.ink)} numberOfLines={1}>{m.product_name ?? "—"}</Text>
                  <Text style={t(12, Brand.muted)} numberOfLines={1}>{[MOV_LABEL[m.kind as Kind] ?? m.kind, `${fmtDate(m.created_at, { year: undefined })} ${fmtTime(m.created_at)}`, m.client_name, m.note].filter(Boolean).join(" · ")}</Text>
                </View>
                <ConfirmButton onConfirm={() => removeMove(m)} />
              </Row>
            ))}
          </Card>
        }
      />

      <Sheet visible={!!prod} onClose={() => setProd(null)} title={prod?.id ? "Editar produto" : "Novo produto"}>
        {prod && (
          <>
            <Field label="Nome" value={prod.name} onChangeText={(name) => setP({ name })} error={error} />
            <Field label="Marca" value={prod.brand} onChangeText={(brand) => setP({ brand })} />
            <Segmented value={prod.category} options={[{ value: "uso_cabine", label: "Uso em cabine" }, { value: "home_care", label: "Home care (revenda)" }]} onChange={(category) => setP({ category })} />
            <Field label="Unidade" value={prod.unit} onChangeText={(unit) => setP({ unit })} placeholder="un, ml, g" />
            <MoneyField label="Estoque mínimo" value={prod.min} onChangeText={(min) => setP({ min })} />
            <MoneyField label="Custo (R$)" value={prod.cost} onChangeText={(cost) => setP({ cost })} />
            <MoneyField label="Preço de venda (R$)" value={prod.sale} onChangeText={(sale) => setP({ sale })} />
            {prod.id ? <Toggle label="Produto ativo" value={prod.active} onChange={(active) => setP({ active })} /> : <MoneyField label="Quantidade inicial" value={prod.initial} onChangeText={(initial) => setP({ initial })} />}
            <Button onPress={saveProduct}>{prod.id ? "Salvar produto" : "Cadastrar produto"}</Button>
          </>
        )}
      </Sheet>

      <Sheet visible={!!mov} onClose={() => setMov(null)} title={mov?.product ? `Movimentar · ${mov.product.name}` : undefined}>
        {mov?.product && (
          <>
            <Segmented value={mov.kind} options={Object.entries(MOV_LABEL).map(([value, label]) => ({ value: value as Kind, label }))} onChange={(kind) => setM({ kind })} />
            <MoneyField label={mov.kind === "ajuste" ? `Quantidade contada (hoje ${qtyFmt(mov.product.stock_qty)})` : "Quantidade"} value={mov.qty} onChangeText={(qty) => setM({ qty })} error={error} />
            {mov.kind === "entrada" && (
              <>
                <MoneyField label="Custo unitário (R$)" value={mov.cost} onChangeText={(cost) => setM({ cost })} />
                <Toggle label="Lançar como despesa" value={mov.expense} onChange={(expense) => setM({ expense })} />
              </>
            )}
            {mov.kind === "venda" && (
              <>
                <MoneyField label="Preço unitário (R$)" value={mov.price} onChangeText={(price) => setM({ price })} />
                <Select label="Cliente (opcional)" value={mov.client} searchable options={clients.map((c) => ({ value: c.id, label: c.name }))} onChange={(client) => setM({ client })} />
              </>
            )}
            {(mov.kind === "venda" || (mov.kind === "entrada" && mov.expense)) && <Select label="Forma de pagamento" value={mov.method} options={METHOD_OPTIONS} onChange={(method) => setM({ method })} />}
            <Field label="Observação" value={mov.note} onChangeText={(note) => setM({ note })} />
            <Button onPress={saveMovement}>Registrar</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
