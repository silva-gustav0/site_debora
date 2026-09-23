import Link from "next/link";
import { BellRing, CalendarClock, CheckCircle2, Clock, MessageCircle, Package, UserRound, XCircle } from "lucide-react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { Avatar, Badge, StatusBadge } from "./ui";
import {
  completeAppointment, markReminderSent, rescheduleAppointment, setAppointmentStatus,
} from "@/app/painel/actions";
import {
  brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, formatPhone, METHOD_LABEL, nowMs, SITE_URL, whatsappLink,
} from "@/lib/format";
import type { AppointmentWithRefs, ClientPackage, Settings } from "@/lib/types";

function StatusButton({ id, status, children, className = "p-btn-ghost p-btn-sm" }: { id: string; status: string; children: React.ReactNode; className?: string }) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}

/** Tudo sobre um atendimento: dados, mensagens prontas e ações. */
export default function AppointmentPanel({
  appt, settings, pkg,
}: { appt: AppointmentWithRefs; settings: Settings; pkg?: ClientPackage | null }) {
  const client = appt.clients;
  const service = appt.services?.name ?? "Atendimento";
  const day = dateSP(appt.starts_at);
  const time = fmtTime(appt.starts_at);
  const open = appt.status === "solicitado" || appt.status === "confirmado";
  const vars = {
    nome: client ? firstName(client.name) : "",
    servico: service,
    data: fmtDate(day, { year: undefined }),
    hora: time,
    clinica: settings.clinic_name,
    link: `${SITE_URL}/meu-agendamento/${appt.public_token}`,
  };
  const wa = (key: keyof Settings["templates"]) => whatsappLink(client?.phone, fillTemplate(settings.templates[key], vars));
  const hoursUntil = (Date.parse(appt.starts_at) - nowMs()) / 3_600_000;

  return (
    <div className="flex flex-col gap-5">
      {/* Cliente */}
      <div className="flex items-center gap-3">
        {client && <Avatar name={client.name} size={46} />}
        <div className="flex-1 min-w-0">
          <p className="text-lg text-[#2C1A1E] truncate">{client?.name ?? "Cliente removida"}</p>
          <p className="text-sm text-[#8F7479] p-num">{formatPhone(client?.phone) || "Sem telefone"}</p>
        </div>
        {client && (
          <Link href={`/painel/clientes/${client.id}`} className="p-btn-ghost p-btn-sm"><UserRound size={13} /> Ficha</Link>
        )}
      </div>

      {/* Resumo */}
      <div className="rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm" style={{ background: "linear-gradient(135deg,#FFF5F2,#FFF9EE)", border: "1px solid #F3E2D8" }}>
        <div className="col-span-2 flex items-center justify-between gap-2">
          <p className="p-display text-2xl text-[#2C1A1E]">{service}</p>
          <StatusBadge status={appt.status} />
        </div>
        <p className="flex items-center gap-2 text-[#6B4C52]"><CalendarClock size={15} className="text-[#C9973A]" /> {fmtWeekday(day)}, {fmtDate(day, { year: undefined })}</p>
        <p className="flex items-center gap-2 text-[#6B4C52]"><Clock size={15} className="text-[#C9973A]" /> {time}–{fmtTime(appt.ends_at)}</p>
        <p className="text-[#6B4C52]">Valor: <strong className="p-num">{pkg ? "Pacote" : brl(appt.price)}</strong></p>
        <p className="text-[#6B4C52]">Origem: {appt.source === "site" ? "Site" : "Painel"}</p>
        {pkg && (
          <p className="col-span-2 flex items-center gap-2 text-[#6B4C52]">
            <Package size={15} className="text-[#C9973A]" /> {pkg.name} · sessão {Number(pkg.sessions_used) + (appt.status === "concluido" ? 0 : 1)} de {pkg.sessions_total}
          </p>
        )}
        {appt.confirmed_at && <p className="col-span-2 text-xs text-[#8F7479]">Confirmado em {fmtDate(appt.confirmed_at)} {fmtTime(appt.confirmed_at)}</p>}
        {appt.reminder_sent_at && <p className="col-span-2 text-xs text-[#8F7479]">Lembrete enviado em {fmtDate(appt.reminder_sent_at)} {fmtTime(appt.reminder_sent_at)}</p>}
        {appt.cancel_reason && <p className="col-span-2 text-xs text-[#9B2C2C]">Motivo: {appt.cancel_reason}</p>}
      </div>
      {appt.notes && <p className="text-sm rounded-xl bg-white border border-[#F3E7E4] px-4 py-3 text-[#6B4C52]">“{appt.notes}”</p>}

      {/* Mensagens */}
      {client?.phone && (
        <section>
          <p className="p-label">Mensagens prontas</p>
          <div className="flex flex-wrap gap-2">
            {appt.status === "solicitado" && (
              <a href={wa("confirmacao") ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm"><MessageCircle size={13} /> Confirmação</a>
            )}
            {open && hoursUntil > 0 && (
              <span className="inline-flex gap-1">
                <a href={wa("lembrete") ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm"><BellRing size={13} /> Lembrete</a>
                {!appt.reminder_sent_at && (
                  <form action={markReminderSent}>
                    <input type="hidden" name="id" value={appt.id} />
                    <SubmitButton className="p-btn-ghost p-btn-sm" title="Marcar lembrete como enviado">✓ enviado</SubmitButton>
                  </form>
                )}
              </span>
            )}
            {appt.status === "concluido" && (
              <a href={wa("pos_atendimento") ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm"><MessageCircle size={13} /> Pós-atendimento</a>
            )}
          </div>
        </section>
      )}

      {/* Status */}
      <section className="flex flex-wrap gap-2">
        {appt.status === "solicitado" && <StatusButton id={appt.id} status="confirmado" className="p-btn p-btn-sm"><CheckCircle2 size={13} /> Confirmar</StatusButton>}
        {open && <StatusButton id={appt.id} status="faltou">Faltou</StatusButton>}
        {!open && <StatusButton id={appt.id} status="confirmado">Reabrir</StatusButton>}
      </section>

      {/* Concluir */}
      {open && (
        <ActionForm action={completeAppointment} className="rounded-2xl border border-[#EFE2DE] bg-white p-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={appt.id} />
          <p className="p-display text-xl text-[#2C1A1E]">Concluir atendimento</p>
          <label className="flex items-center gap-2 text-sm text-[#6B4C52]">
            <input type="checkbox" name="register_payment" defaultChecked={!pkg} className="accent-[#A85B63]" />
            Registrar pagamento {pkg && <Badge tone="plum">sessão de pacote já paga</Badge>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="p-label">Valor recebido</span>
              <input name="amount" inputMode="decimal" defaultValue={String(appt.price).replace(".", ",")} className="p-input p-num" />
            </label>
            <label>
              <span className="p-label">Forma</span>
              <select name="method" defaultValue="pix" className="p-input">
                {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-[#8F7479]">Taxas da maquininha: crédito {settings.fee_credit}% · débito {settings.fee_debit}% (lançadas automaticamente).</p>
          <label>
            <span className="p-label">Evolução da sessão (vai para o prontuário)</span>
            <textarea name="record_note" rows={3} placeholder="Como foi a sessão, produtos usados, reação da pele, orientações…" className="p-input resize-y" />
          </label>
          <div><SubmitButton className="p-btn" pendingText="Concluindo…"><CheckCircle2 size={14} /> Concluir</SubmitButton></div>
        </ActionForm>
      )}

      {/* Remarcar / cancelar */}
      {open && (
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionForm action={rescheduleAppointment} className="rounded-2xl border border-[#EFE2DE] bg-white p-4 flex flex-col gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <p className="text-sm font-bold text-[#2C1A1E]">Remarcar</p>
            <input type="date" name="date" defaultValue={day} required className="p-input" aria-label="Nova data" />
            <input type="time" name="time" defaultValue={time} step={900} required className="p-input" aria-label="Novo horário" />
            <SubmitButton className="p-btn-ghost p-btn-sm">Salvar novo horário</SubmitButton>
          </ActionForm>
          <form action={setAppointmentStatus} className="rounded-2xl border border-[#EFE2DE] bg-white p-4 flex flex-col gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <input type="hidden" name="status" value="cancelado" />
            <p className="text-sm font-bold text-[#2C1A1E]">Cancelar</p>
            <input name="reason" placeholder="Motivo (opcional)" className="p-input" />
            <SubmitButton className="p-btn-ghost p-btn-sm p-btn-danger"><XCircle size={13} /> Cancelar horário</SubmitButton>
          </form>
        </div>
      )}

      <p className="text-xs text-[#8F7479]">
        Link da cliente: <a href={vars.link} target="_blank" className="underline break-all">{vars.link}</a>
      </p>
    </div>
  );
}
