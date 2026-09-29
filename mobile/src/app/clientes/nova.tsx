import { Card, Screen } from "@/components/ui";
import { ClientForm } from "@/lib/clients";

/** Cadastro de nova cliente (mesmo formulário da gaveta do painel). */
export default function NovaCliente() {
  return (
    <Screen eyebrow="Cadastro" title="Nova cliente" subtitle="Dados de contato, origem e etapa no funil." back>
      <Card title="Dados cadastrais"><ClientForm /></Card>
    </Screen>
  );
}
