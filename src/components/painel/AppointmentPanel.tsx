import Link from "next/link";
import { BellRing, CalendarClock, CheckCircle2, Clock, Gift, MessageCircle, Package, Play, UserRound, XCircle } from "lucide-react";
import ActionForm from "./ActionForm";
import AnamnesisLinkButton from "./AnamnesisLinkButton";
import SubmitButton from "./SubmitButton";
import { Avatar, Badge, StatusBadge } from "./ui";
import {
  completeAppointment, markReminderSent, rescheduleAppointment, setAppointmentStatus,
} from "@/app/painel/actions";
import {
  brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, formatPhone, METHOD_LABEL, nowMs, SITE_URL, whatsappLink,
} from "@/lib/format";
import type { AnamnesisLink, AppointmentWithRefs, ClientPackage, Settings } from "@/lib/types";

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
  appt, settings, pkg, anamnesisLink = null,
}: { appt: AppointmentWithRefs; settings: Settings; pkg?: ClientPackage | null; anamnesisLink?: AnamnesisLink | null }) {
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
  // Voucher: quanto ele cobre e quanto falta cobrar (igual ao cálculo de completeAppointment).
  const v = appt.vouchers;
  const covered = !v ? 0 : appt.voucher_amount !== null ? Number(appt.voucher_amount) : v.kind === "servico" ? Number(appt.price) : Math.min(Number(v.balance), Number(appt.price));
  const due = Math.max(0, Math.round((Number(appt.price) - covered) * 100) / 100);
  const al = anamnesisLink;
  const anamnesisStatus = !al || al.revoked_at ? null
    : al.submitted_at ? `Ficha recebida às ${fmtTime(al.submitted_at)} de ${fmtDate(al.submitted_at)}.`
    : Date.parse(al.expires_at) > nowMs() ? `Link enviado às ${fmtTime(al.created_at)}, vale até ${fmtTime(al.expires_at)}.`
    : `O último link expirou às ${fmtTime(al.expires_at)} de ${fmtDate(al.expires_at)}.`;

  return (
    <div className="flex flex-col gap-5">
      {/* Cliente */}
      <div className="flex items-center gap-3">
        {client && <Avatar name={client.name} size={46} />}
        <div className="flex-1 min-w-0">
          <p className="text-lg text-[#2B221B] truncate">{client?.name ?? "Cliente removido"}</p>
          <p className="text-sm text-[#857566] p-num">{formatPhone(client?.phone) || "Sem telefone"}</p>
        </div>
        {client && (
          <Link href={`/painel/clientes/${client.id}`} className="p-btn-ghost p-btn-sm"><UserRound size={13} /> Ficha</Link>
        )}
      </div>

      {/* Resumo */}
      <div className="rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm" style={{ background: "linear-gradient(135deg,#FDF7EF,#FFF9EE)", border: "1px solid #F3E2D8" }}>
        <div className="col-span-2 flex items-center justify-between gap-2">
          <p className="p-display text-2xl text-[#2B221B]">{service}</p>
          <StatusBadge status={appt.status} />
        </div>
        <p className="flex items-center gap-2 text-[#6B5A4B]"><CalendarClock size={15} className="text-[#C9973A]" /> {fmtWeekday(day)}, {fmtDate(day, { year: undefined })}</p>
        <p className="flex items-center gap-2 text-[#6B5A4B]"><Clock size={15} className="text-[#C9973A]" /> {time}–{fmtTime(appt.ends_at)}</p>
        <p className="text-[#6B5A4B]">Valor: <strong className="p-num">{pkg ? "Pacote" : v ? (due === 0 ? "Pago (voucher)" : `${brl(due)} + voucher`) : brl(appt.price)}</strong></p>
        <p className="text-[#6B5A4B]">Origem: {appt.source === "site" ? "Site" : "Painel"}</p>
        {pkg && (
          <p className="col-span-2 flex items-center gap-2 text-[#6B5A4B]">
            <Package size={15} className="text-[#C9973A]" /> {pkg.name} · sessão {Number(pkg.sessions_used) + (appt.status === "concluido" ? 0 : 1)} de {pkg.sessions_total}
          </p>
        )}
        {v && (
          <p className="col-span-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[#1F6B3A] bg-[#EAF6EE]">
            <Gift size={15} /> Voucher <strong className="p-num">{v.code}</strong> ·{" "}
            {v.kind === "servico" ? `${v.service_name ?? "serviço"} já pago` : `cobre ${brl(covered)}`}
            {due > 0 && <span className="text-[#6B5A4B]"> · cobrar {brl(due)}</span>}
          </p>
        )}
        {appt.confirmed_at && <p className="col-span-2 text-xs text-[#857566]">Confirmado em {fmtDate(appt.confirmed_at)} {fmtTime(appt.confirmed_at)}</p>}
        {appt.reminder_sent_at && <p className="col-span-2 text-xs text-[#857566]">Lembrete enviado em {fmtDate(appt.reminder_sent_at)} {fmtTime(appt.reminder_sent_at)}</p>}
        {appt.cancel_reason && <p className="col-span-2 text-xs text-[#9B2C2C]">Motivo: {appt.cancel_reason}</p>}
      </div>
      {appt.notes && <p className="text-sm rounded-xl bg-white border border-[#F3ECE0] px-4 py-3 text-[#6B5A4B]">“{appt.notes}”</p>}

      {open && (
        <Link href={`/painel/atendimento/${appt.id}`} prefetch className="p-btn p-btn-gold h-14 text-[15px] justify-center">
          <Play size={17} /> Iniciar atendimento
        </Link>
      )}

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

      {client && <AnamnesisLinkButton appointmentId={appt.id} phone={client.phone} greeting={`Olá, ${vars.nome}!`} status={anamnesisStatus} />}

      {/* Status */}
      <section className="flex flex-wrap gap-2">
        {appt.status === "solicitado" && <StatusButton id={appt.id} status="confirmado" className="p-btn p-btn-sm"><CheckCircle2 size={13} /> Confirmar</StatusButton>}
        {open && <StatusButton id={appt.id} status="faltou">Faltou</StatusButton>}
        {!open && <StatusButton id={appt.id} status="confirmado">Reabrir</StatusButton>}
      </section>

      {/* Concluir */}
      {open && (
        <ActionForm action={completeAppointment} className="rounded-2xl border border-[#EEE5D8] bg-white p-4 flex flex-col gap-3">
          <input type="hidden" name="id" value={appt.id} />
          <p className="p-display text-xl text-[#2B221B]">Concluir atendimento</p>
          {v && due === 0 ? (
            <p className="flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 bg-[#EAF6EE] text-[#1F6B3A]">
              <CheckCircle2 size={15} /> Já pago pelo voucher {v.code}. Não cobre a cliente.
            </p>
          ) : (<>
          {v && <p className="text-sm text-[#6B5A4B]">O voucher {v.code} cobre {brl(covered)}. Cobre só a diferença.</p>}
          <label className="flex items-center gap-2 text-sm text-[#6B5A4B]">
            <input type="checkbox" name="register_payment" defaultChecked={!pkg} className="accent-[#82590F]" />
            Registrar pagamento {pkg && <Badge tone="plum">sessão de pacote já paga</Badge>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="p-label">{v ? "Diferença recebida" : "Valor recebido"}</span>
              <input name="amount" inputMode="decimal" defaultValue={String(v ? due : appt.price).replace(".", ",")} className="p-input p-num" />
            </label>
            <label>
              <span className="p-label">Forma</span>
              <select name="method" defaultValue="pix" className="p-input">
                {Object.entries(METHOD_LABEL).map(([m, l]) => <option key={m} value={m}>{l}</option>)}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-[#857566]">Taxas da maquininha: crédito {settings.fee_credit}% · débito {settings.fee_debit}% (lançadas automaticamente).</p>
          </>)}
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
          <ActionForm action={rescheduleAppointment} className="rounded-2xl border border-[#EEE5D8] bg-white p-4 flex flex-col gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <p className="text-sm font-bold text-[#2B221B]">Remarcar</p>
            <input type="date" name="date" defaultValue={day} required className="p-input" aria-label="Nova data" />
            <input type="time" name="time" defaultValue={time} step={900} required className="p-input" aria-label="Novo horário" />
            <SubmitButton className="p-btn-ghost p-btn-sm">Salvar novo horário</SubmitButton>
          </ActionForm>
          <form action={setAppointmentStatus} className="rounded-2xl border border-[#EEE5D8] bg-white p-4 flex flex-col gap-2">
            <input type="hidden" name="id" value={appt.id} />
            <input type="hidden" name="status" value="cancelado" />
            <p className="text-sm font-bold text-[#2B221B]">Cancelar</p>
            <input name="reason" placeholder="Motivo (opcional)" className="p-input" />
            <SubmitButton className="p-btn-ghost p-btn-sm p-btn-danger"><XCircle size={13} /> Cancelar horário</SubmitButton>
          </form>
        </div>
      )}

      <p className="text-xs text-[#857566]">
        Link do cliente: <a href={vars.link} target="_blank" className="underline break-all">{vars.link}</a>
      </p>
    </div>
  );
}
