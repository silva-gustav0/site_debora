import { Screen } from "@/components/ui";
import { ClientForm } from "@/lib/clients";

/** Cadastro de nova cliente. */
export default function NovaCliente() {
  return <Screen title="Nova cliente" back><ClientForm /></Screen>;
}
