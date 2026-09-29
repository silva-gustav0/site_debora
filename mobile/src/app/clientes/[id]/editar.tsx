import { useStatus } from "@powersync/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Card, ConfirmButton, Empty, Screen, Txt, useToast } from "@/components/ui";
import { write } from "@/db/write";
import { ClientForm, useClient } from "@/lib/clients";
import { removeClientPhotos } from "@/lib/photo-sync";

/** Edição dos dados da cliente e exclusão do cadastro (LGPD). */
export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  const toast = useToast();
  const { connected } = useStatus();
  const remove = async () => {
    if (connected) await removeClientPhotos(id).catch(() => toast("Não foi possível remover as fotos do armazenamento.", "error"));
    await write((w) => w.remove("clients", id));
    toast("Cliente excluída.");
    router.dismissTo("/clientes");
  };
  if (!c) return <Screen title="Editar cliente" back><Empty text="Cliente não encontrada." /></Screen>;
  return (
    <Screen title="Editar cliente" subtitle={c.name} back>
      <ClientForm client={c} />
      <Card title="Excluir cliente" eyebrow="Zona de risco">
        <Txt.muted>Remove a cliente com agendamentos, prontuário, fotos e anotações (direito de exclusão da LGPD). Os lançamentos financeiros permanecem, sem vínculo.</Txt.muted>
        {!connected && <Txt.muted>Sem internet: as fotos no armazenamento só serão apagadas se você excluir com o aparelho on-line.</Txt.muted>}
        <ConfirmButton confirmText="Excluir definitivamente" onConfirm={remove}>Excluir cliente</ConfirmButton>
      </Card>
    </Screen>
  );
}
