import { router } from "expo-router";
import { Card, ConfirmButton, type IconName, Ionicons, ListItem, Screen, Txt } from "@/components/ui";
import { useMe } from "@/db/hooks";
import { Brand } from "@/constants/brand";
import { useSession } from "@/lib/session";

const ITEMS: [string, string, IconName, string][] = [
  ["Pacotes", "/pacotes", "gift-outline", "Pacotes de sessões vendidos"],
  ["Estoque", "/estoque", "cube-outline", "Produtos e movimentações"],
  ["Vouchers", "/vouchers", "ticket-outline", "Vales-presente e créditos"],
  ["CRM e campanhas", "/crm", "megaphone-outline", "Funil, tarefas e mensagens em massa"],
  ["Recorrência", "/recorrencia", "repeat-outline", "Quem deveria estar voltando"],
  ["Relatórios", "/relatorios", "bar-chart-outline", "Ocupação, faltas, faturamento e demanda"],
  ["Serviços", "/servicos", "sparkles-outline", "Preços, duração e retorno"],
  ["Configurações", "/configuracoes", "settings-outline", "Clínica, horários, mensagens e anamnese"],
  ["Equipe", "/equipe", "people-outline", "Acessos ao painel e senha"],
  ["Sincronização e conflitos", "/conflitos", "sync-outline", "Estado da sincronização"],
];

/** Menu "Mais": telas de gestão e configuração, e saída do aparelho. */
export default function Mais() {
  const me = useMe();
  const { signOut } = useSession();
  return (
    <Screen title="Mais">
      <Card>
        {ITEMS.map(([title, href, icon, subtitle]) => (
          <ListItem key={href} title={title} subtitle={subtitle} left={<Ionicons name={icon} size={22} color={Brand.bronze} />} onPress={() => router.push(href as never)} />
        ))}
      </Card>
      <Card>
        {me && <Txt.strong>{me.name}{me.isAdmin ? " · Administradora" : ""}</Txt.strong>}
        <ConfirmButton confirmText="Toque de novo para apagar e sair" onConfirm={signOut} small={false}>Sair e apagar os dados deste aparelho</ConfirmButton>
      </Card>
    </Screen>
  );
}
