import { useQuery } from "@powersync/react-native";
import { todaySP } from "@shared/format";
import { computeRecurrence } from "@shared/recurrence";
import type { ClientSource, ClientStage, ClientStats, TemplateKey } from "@shared/types";
import { useMemo } from "react";
import { asBool, asList, useServices } from "@/db/hooks";
import { write } from "@/db/write";

/** Agregado SQL (min/max) de um campo de data dos atendimentos, como texto ISO em UTC. */
const agg = (fn: string, cond: string) => `strftime('%Y-%m-%dT%H:%M:%SZ', ${fn}(case when ${cond} then julianday(a.starts_at) end))`;
const DONE = "a.status = 'concluido'";
const dn = (fn: string) => `${fn}(case when ${DONE} then julianday(a.starts_at) end)`;

/** Equivalente local da view client_stats (visitas, última visita, próximo agendamento, intervalo médio). */
const CLIENTS_SQL = `select c.id, c.id as client_id, c.name, c.phone, c.stage, c.birth_date, c.tags, c.source, c.marketing_opt_in, c.created_at, 0 as total_spent,
  count(case when ${DONE} then 1 end) as visits, ${agg("min", DONE)} as first_visit, ${agg("max", DONE)} as last_visit,
  ${agg("min", "a.status in ('solicitado','confirmado') and julianday(a.starts_at) > julianday('now')")} as next_appointment,
  count(case when a.status = 'faltou' then 1 end) as no_shows,
  (select a2.service_id from appointments a2 where a2.client_id = c.id and a2.status = 'concluido' order by julianday(a2.starts_at) desc limit 1) as last_service_id,
  case when count(case when ${DONE} then 1 end) > 1 then (${dn("max")} - ${dn("min")}) / (count(case when ${DONE} then 1 end) - 1) end as avg_interval_days
  from clients c left join appointments a on a.client_id = c.id group by c.id order by c.name`;

type ClientRow = ClientStats & { id: string; name: string; phone: string | null; stage: ClientStage; birth_date: string | null; tags: string; source: ClientSource; marketing_opt_in: number; created_at: string };

/** Clientes com estatísticas e situação de retorno (mesmo cálculo do painel web). */
export function useClients() {
  return useClientsState().clients;
}

/** Igual a useClients, dizendo também se a primeira leitura ainda está em andamento (para não mostrar zeros). */
export function useClientsState() {
  const { data, isLoading } = useQuery<ClientRow>(CLIENTS_SQL);
  const services = useServices();
  const clients = useMemo(() => {
    const today = todaySP();
    const returnDays = new Map(services.map((s) => [s.id, s.return_days]));
    return data.map((r) => ({
      ...r, tags: asList(r.tags), optIn: asBool(r.marketing_opt_in),
      recurrence: computeRecurrence(r, r.last_service_id ? returnDays.get(r.last_service_id) : null, today),
    }));
  }, [data, services]);
  return { clients, loading: isLoading };
}
export type Client = ReturnType<typeof useClients>[number];

/** Registra que a cliente foi contatada pelo WhatsApp (retorno, campanha, aniversário…). */
export const logContact = (clientId: string, content = "Mensagem enviada pelo WhatsApp.") =>
  write((w) => w.insert("interactions", { client_id: clientId, kind: "whatsapp", content: content.slice(0, 500), created_at: new Date().toISOString() }));

export const TEMPLATE_INFO: Record<TemplateKey, { title: string; when: string }> = {
  confirmacao: { title: "Confirmação", when: "Enviada ao confirmar um pedido do site." },
  lembrete: { title: "Lembrete (véspera)", when: "Enviada no dia anterior ao atendimento." },
  pos_atendimento: { title: "Pós-atendimento", when: "Enviada após concluir o atendimento." },
  retorno: { title: "Retorno", when: "Quando chega a hora da próxima sessão." },
  reativacao: { title: "Reativação", when: "Para clientes inativos há muito tempo." },
  aniversario: { title: "Aniversário", when: "No dia do aniversário da cliente." },
};
