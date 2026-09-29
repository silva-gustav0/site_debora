import { useQuery } from "@powersync/react-native";
import { todaySP } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, Card, DateField, Field, MoneyField, parseMoney, Row, Screen, Segmented, Select, useToast } from "@/components/ui";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { CATEGORIES, installmentsOf, METHOD_OPTIONS } from "@/lib/finance";

/** Novo lançamento (receita ou despesa), à vista, pendente ou parcelado. */
export default function NovoLancamento() {
  const toast = useToast();
  const settings = useSettings();
  const { data: clients } = useQuery<{ id: string; name: string }>("select id, name from clients order by name");
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<"receita" | "despesa">(params.kind === "despesa" ? "despesa" : "receita");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<string | null>(todaySP());
  const [method, setMethod] = useState("pix");
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState<"pago" | "pendente">("pago");
  const [installments, setInstallments] = useState("1");
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const total = parseMoney(amount);
    const n = Math.min(Math.max(parseInt(installments, 10) || 1, 1), 24);
    if (!Number.isFinite(total) || total <= 0) return setError("Informe um valor válido.");
    if (!date) return setError("Informe a data.");
    await write(async (w) => {
      for (const [i, p] of installmentsOf(total, n, date).entries()) {
        const paid = pending === "pago" && i === 0;
        await w.insert("transactions", {
          kind, amount: p.value, method, fee: kind === "receita" && paid ? cardFee(settings, method, p.value) : 0,
          status: paid ? "pago" : "pendente", occurred_on: p.due, due_on: paid ? null : p.due,
          category: category || (kind === "receita" ? "Atendimento" : "Outros"),
          description: n > 1 ? `${description.trim() || "Parcela"} (${i + 1}/${n})` : description.trim() || null,
          client_id: kind === "receita" ? clientId : null, created_at: new Date().toISOString(),
        });
      }
    });
    toast(n > 1 ? `${n} parcelas lançadas.` : kind === "receita" ? "Receita registrada." : "Despesa registrada.");
    router.back();
  };

  const grid = { alignItems: "flex-start" as const, flexWrap: "wrap" as const };
  return (
    <Screen eyebrow="Lançamento" title={kind === "receita" ? "Nova receita" : "Nova despesa"} subtitle="À vista, a receber ou parcelado em lançamentos mensais." back>
      <Card style={{ maxWidth: 760, width: "100%" }} bodyStyle={{ gap: 14 }}>
        <Segmented value={kind} options={[{ value: "receita", label: "Receita" }, { value: "despesa", label: "Despesa" }]} onChange={(k) => { setKind(k); setCategory(null); }} />
        <Row style={grid} gap={12}>
          <MoneyField label="Valor total (R$)" value={amount} onChangeText={setAmount} error={error} />
          <DateField label="Data / vencimento" value={date} onChange={setDate} />
        </Row>
        <Row style={grid} gap={12}>
          <Select label="Categoria" value={category ?? CATEGORIES[kind][0]} options={CATEGORIES[kind].map((c) => ({ value: c, label: c }))} onChange={setCategory} />
          <Select label="Forma" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
        </Row>
        <Segmented value={pending} options={[{ value: "pago", label: kind === "receita" ? "Recebido" : "Pago" }, { value: "pendente", label: kind === "receita" ? "A receber" : "A pagar" }]} onChange={setPending} />
        <Row style={grid} gap={12}>
          <Field label="Parcelas (1 a 24)" value={installments} onChangeText={setInstallments} keyboardType="number-pad" />
          {kind === "receita" && <Select label="Cliente (opcional)" value={clientId} searchable options={clients.map((c) => ({ value: c.id, label: c.name }))} onChange={setClientId} />}
        </Row>
        <Field label="Descrição" value={description} onChangeText={setDescription} placeholder={kind === "despesa" ? "Ex.: Aluguel de outubro" : "Opcional"} hint="Com mais de 1 parcela, o valor é dividido em lançamentos mensais (as seguintes ficam pendentes)." />
        <Button onPress={save}>Lançar</Button>
      </Card>
    </Screen>
  );
}
