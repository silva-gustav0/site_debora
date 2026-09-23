import { requireStaff } from "@/lib/dal";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/format";
import { hoursSummary, WEEKDAY_NAMES } from "@/lib/hours";
import ActionForm from "@/components/painel/ActionForm";
import SubmitButton from "@/components/painel/SubmitButton";
import { Avatar, Card, PageHeader, Tabs } from "@/components/painel/ui";
import { changeOwnPassword, createStaffMember, saveSettings, saveTemplates } from "../../actions";
import type { BusinessHours, TemplateKey } from "@/lib/types";

export const metadata = { title: "Configurações" };

const TEMPLATE_INFO: Record<TemplateKey, { title: string; when: string }> = {
  confirmacao: { title: "Confirmação", when: "Enviada ao confirmar um pedido do site." },
  lembrete: { title: "Lembrete (véspera)", when: "Enviada no dia anterior ao atendimento." },
  pos_atendimento: { title: "Pós-atendimento", when: "Enviada após concluir o atendimento." },
  retorno: { title: "Retorno", when: "Quando chega a hora da próxima sessão." },
  reativacao: { title: "Reativação", when: "Para clientes inativas há muito tempo." },
  aniversario: { title: "Aniversário", when: "No dia do aniversário da cliente." },
};

export default async function SettingsPage({ searchParams }: PageProps<"/painel/configuracoes">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const tab = ["clinica", "mensagens", "equipe"].includes(String(sp.tab)) ? String(sp.tab) : "clinica";
  const [settings, staffRes] = await Promise.all([
    getSettings(supabase),
    supabase.from("staff").select("user_id, name, created_at").order("created_at"),
  ]);
  const hours = settings.business_hours;

  return (
    <>
      <PageHeader eyebrow="Ajustes" title="Configurações" subtitle={`Funcionamento atual: ${hoursSummary(hours)}`} />
      <Tabs
        current={tab}
        tabs={[
          { key: "clinica", label: "Clínica e agenda", href: "/painel/configuracoes" },
          { key: "mensagens", label: "Mensagens de WhatsApp", href: "/painel/configuracoes?tab=mensagens" },
          { key: "equipe", label: "Equipe", href: "/painel/configuracoes?tab=equipe" },
        ]}
      />

      {tab === "clinica" && (
        <ActionForm action={saveSettings} className="grid xl:grid-cols-2 gap-5">
          <Card title="Dados da clínica">
            <div className="grid gap-3">
              <label><span className="p-label">Nome</span><input name="clinic_name" defaultValue={settings.clinic_name} className="p-input" /></label>
              <label><span className="p-label">WhatsApp (com DDI e DDD)</span><input name="whatsapp" defaultValue={settings.whatsapp} className="p-input p-num" placeholder="5511999999999" /></label>
              <label><span className="p-label">Endereço</span><input name="address" defaultValue={settings.address} className="p-input" /></label>
            </div>
          </Card>

          <Card title="Regras do agendamento online">
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="p-label">Intervalo entre horários</span>
                <select name="slot_step_min" defaultValue={settings.slot_step_min} className="p-input">
                  {[15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </label>
              <label><span className="p-label">Antecedência mínima (min)</span><input name="min_lead_min" type="number" min={0} defaultValue={settings.min_lead_min} className="p-input p-num" /></label>
              <label><span className="p-label">Agendar até (dias à frente)</span><input name="max_days_ahead" type="number" min={1} max={365} defaultValue={settings.max_days_ahead} className="p-input p-num" /></label>
              <label><span className="p-label">Cancelar pelo site até (horas antes)</span><input name="cancel_min_hours" type="number" min={0} defaultValue={settings.cancel_min_hours} className="p-input p-num" /></label>
              <label><span className="p-label">Taxa crédito (%)</span><input name="fee_credit" inputMode="decimal" defaultValue={String(settings.fee_credit).replace(".", ",")} className="p-input p-num" /></label>
              <label><span className="p-label">Taxa débito (%)</span><input name="fee_debit" inputMode="decimal" defaultValue={String(settings.fee_debit).replace(".", ",")} className="p-input p-num" /></label>
            </div>
          </Card>

          <Card title="Horário de funcionamento" className="xl:col-span-2" bodyClassName="overflow-x-auto p-5">
            <table className="p-table">
              <thead><tr><th>Dia</th><th>Aberto</th><th>Abre</th><th>Fecha</th><th>Intervalo de</th><th>até</th></tr></thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const h = hours[String(d) as keyof BusinessHours];
                  return (
                    <tr key={d}>
                      <td className="font-bold">{WEEKDAY_NAMES[d]}</td>
                      <td><input type="checkbox" name={`open_day_${d}`} defaultChecked={Boolean(h)} className="accent-[#A85B63] w-4 h-4" aria-label={`${WEEKDAY_NAMES[d]} aberto`} /></td>
                      <td><input type="time" name={`open_${d}`} defaultValue={h?.open ?? "09:00"} className="p-input w-28" aria-label="Abre" /></td>
                      <td><input type="time" name={`close_${d}`} defaultValue={h?.close ?? "18:00"} className="p-input w-28" aria-label="Fecha" /></td>
                      <td><input type="time" name={`break_start_${d}`} defaultValue={h?.break_start ?? ""} className="p-input w-28" aria-label="Início do intervalo" /></td>
                      <td><input type="time" name={`break_end_${d}`} defaultValue={h?.break_end ?? ""} className="p-input w-28" aria-label="Fim do intervalo" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-[#8F7479] mt-3">Os horários valem para o site e para a grade da agenda. Para folgas pontuais, use “Bloquear” na agenda.</p>
          </Card>
          <div className="xl:col-span-2"><SubmitButton pendingText="Salvando…">Salvar configurações</SubmitButton></div>
        </ActionForm>
      )}

      {tab === "mensagens" && (
        <ActionForm action={saveTemplates} className="flex flex-col gap-5">
          <p className="text-sm text-[#6B4C52]">
            Variáveis: <code className="bg-white px-1 rounded">{"{nome}"}</code> <code className="bg-white px-1 rounded">{"{servico}"}</code> <code className="bg-white px-1 rounded">{"{data}"}</code>{" "}
            <code className="bg-white px-1 rounded">{"{hora}"}</code> <code className="bg-white px-1 rounded">{"{clinica}"}</code> <code className="bg-white px-1 rounded">{"{link}"}</code> (link do agendamento da cliente).
          </p>
          <div className="grid lg:grid-cols-2 gap-5">
            {(Object.keys(TEMPLATE_INFO) as TemplateKey[]).map((k) => (
              <Card key={k} title={TEMPLATE_INFO[k].title} eyebrow={TEMPLATE_INFO[k].when}>
                <textarea name={k} rows={4} defaultValue={settings.templates[k]} className="p-input resize-y" aria-label={TEMPLATE_INFO[k].title} />
              </Card>
            ))}
          </div>
          <div><SubmitButton>Salvar mensagens</SubmitButton></div>
        </ActionForm>
      )}

      {tab === "equipe" && (
        <div className="grid xl:grid-cols-2 gap-5">
          <Card title="Pessoas com acesso">
            <ul className="flex flex-col gap-2">
              {(staffRes.data ?? []).map((s) => (
                <li key={s.user_id} className="flex items-center gap-3 rounded-xl border border-[#F1E5E2] px-3 py-2.5">
                  <Avatar name={s.name} size={34} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-[#8F7479]">desde {fmtDate(s.created_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Minha senha" eyebrow="Sua conta">
            <ActionForm action={changeOwnPassword} resetOnSuccess className="grid gap-3">
              <label><span className="p-label">Nova senha</span><input name="password" type="password" minLength={8} required autoComplete="new-password" className="p-input" /></label>
              <label><span className="p-label">Repita a nova senha</span><input name="confirm" type="password" minLength={8} required autoComplete="new-password" className="p-input" /></label>
              <div><SubmitButton>Alterar senha</SubmitButton></div>
            </ActionForm>
          </Card>
          <Card title="Adicionar pessoa" eyebrow="Recepção, sócia ou outra profissional">
            <ActionForm action={createStaffMember} resetOnSuccess className="grid gap-3">
              <label><span className="p-label">Nome</span><input name="name" required className="p-input" /></label>
              <label><span className="p-label">E-mail</span><input name="email" type="email" required className="p-input" /></label>
              <label><span className="p-label">Senha inicial (mín. 8)</span><input name="password" type="password" minLength={8} required autoComplete="new-password" className="p-input" /></label>
              <div><SubmitButton>Criar acesso</SubmitButton></div>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
