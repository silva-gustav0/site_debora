import { useLocalSearchParams } from "expo-router";
import { Card, Empty, Screen } from "@/components/ui";
import { ClientForm, DeleteClientCard, useClient } from "@/lib/clients";

/** Edição dos dados da cliente e exclusão do cadastro (LGPD), como a aba Dados do painel. */
export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  if (!c) return <Screen title="Editar cliente" back><Empty text="Cliente não encontrada." /></Screen>;
  return (
    <Screen eyebrow="Cadastro" title="Editar cliente" subtitle={c.name} back>
      <Card title="Dados cadastrais"><ClientForm client={c} /></Card>
      <DeleteClientCard id={id} />
    </Screen>
  );
}
