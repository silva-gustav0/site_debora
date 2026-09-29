import { useQuery } from "@powersync/react-native";
import { todaySP } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import { router } from "expo-router";
import { useState } from "react";
import { Button, DateField, Field, MoneyField, parseMoney, Screen, Segmented, Select, useToast } from "@/components/ui";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { CATEGORIES, installmentsOf, METHOD_OPTIONS } from "@/lib/finance";

/** Novo lançamento (receita ou despesa), à vista, pendente ou parcelado. */
export default function NovoLancamento() {
  const toast = useToast();
  const settings = useSettings();
  const { data: clients } = useQuery<{ id: string; name: string }>("select id, name from clients order by name");
  const [kind, setKind] = useState<"receita" | "despesa">("receita");
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
          client_id: clientId, created_at: new Date().toISOString(),
        });
      }
    });
    toast(n > 1 ? `${n} parcelas lançadas.` : kind === "receita" ? "Receita registrada." : "Despesa registrada.");
    router.back();
  };

  return (
    <Screen title="Novo lançamento" back>
      <Segmented value={kind} options={[{ value: "receita", label: "Receita" }, { value: "despesa", label: "Despesa" }]} onChange={(k) => { setKind(k); setCategory(null); }} />
      <MoneyField label="Valor total (R$)" value={amount} onChangeText={setAmount} error={error} />
      <DateField label="Data / vencimento" value={date} onChange={setDate} />
      <Select label="Categoria" value={category ?? CATEGORIES[kind][0]} options={CATEGORIES[kind].map((c) => ({ value: c, label: c }))} onChange={setCategory} />
      <Select label="Forma" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
      <Segmented value={pending} options={[{ value: "pago", label: kind === "receita" ? "Recebido" : "Pago" }, { value: "pendente", label: kind === "receita" ? "A receber" : "A pagar" }]} onChange={setPending} />
      <Field label="Parcelas (1 a 24)" value={installments} onChangeText={setInstallments} keyboardType="number-pad" hint="Com mais de 1 parcela, o valor é dividido em lançamentos mensais (as seguintes ficam pendentes)." />
      <Select label="Cliente (opcional)" value={clientId} searchable options={clients.map((c) => ({ value: c.id, label: c.name }))} onChange={setClientId} />
      <Field label="Descrição" value={description} onChangeText={setDescription} placeholder={kind === "despesa" ? "Ex.: Aluguel de outubro" : "Opcional"} />
      <Button onPress={save}>Lançar</Button>
    </Screen>
  );
}
