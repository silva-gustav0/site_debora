import { router, useLocalSearchParams } from "expo-router";
import { Card, Empty, Screen } from "@/components/ui";
import { AnamnesisForm } from "@/components/client-anamnesis";
import { useClient } from "@/lib/clients";

/** Preenchimento/edição da ficha de anamnese pela equipe, conforme o modelo da clínica. */
export default function AnamneseCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  if (!c) return <Screen title="Anamnese" back><Empty text="Cliente não encontrada." /></Screen>;
  return (
    <Screen eyebrow="Prontuário" title="Anamnese" subtitle={c.name} back>
      <Card title="Ficha de anamnese" eyebrow="Avaliação"><AnamnesisForm c={c} onSaved={() => router.back()} /></Card>
    </Screen>
  );
}
