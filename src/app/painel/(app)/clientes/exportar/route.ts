import { requireStaff } from "@/lib/dal";
import { csvResponse, toCsv } from "@/lib/csv";
import { clientsWithStats } from "@/lib/queries";
import { fmtDate, formatPhone, SOURCE_LABEL, STAGE_LABEL, todaySP } from "@/lib/format";
import { RECURRENCE_META } from "@/lib/recurrence";

export async function GET() {
  const { supabase } = await requireStaff();
  const today = todaySP();
  const clients = await clientsWithStats(supabase, today);
  const body = toCsv(
    ["Nome", "WhatsApp", "E-mail", "Nascimento", "Origem", "Etapa", "Etiquetas", "Visitas", "Última visita", "Total investido", "Recorrência", "Aceita mensagens", "Cadastro"],
    clients.map((c) => [
      c.name, formatPhone(c.phone), c.email, c.birth_date ? fmtDate(c.birth_date) : "", SOURCE_LABEL[c.source], STAGE_LABEL[c.stage],
      c.tags.join(", "), Number(c.stats?.visits ?? 0), c.stats?.last_visit ? fmtDate(c.stats.last_visit) : "",
      Number(c.stats?.total_spent ?? 0), RECURRENCE_META[c.recurrence.status].label, c.marketing_opt_in ? "Sim" : "Não", fmtDate(c.created_at),
    ]),
  );
  return csvResponse(`clientes-${today}.csv`, body);
}
