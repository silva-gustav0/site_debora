import Link from "next/link";
import { BellRing, CalendarPlus, ChevronLeft, ChevronRight, Lock, MessageCircle, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { activePackages, APPT_SELECT, appointmentsBetween, blocksBetween, listServices } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import {
  addDays, brl, dateSP, fillTemplate, firstName, fmtDate, fmtTime, fmtWeekday, SITE_URL, todaySP, weekday, whatsappLink,
} from "@/lib/format";
import { toMinutes } from "@/lib/hours";
import ActionForm from "@/components/painel/ActionForm";
import AgendaGrid from "@/components/painel/AgendaGrid";
import AppointmentItem from "@/components/painel/AppointmentItem";
import AppointmentPanel from "@/components/painel/AppointmentPanel";
import ConfirmButton from "@/components/painel/ConfirmButton";
import Drawer from "@/components/painel/Drawer";
import NewAppointmentForm from "@/components/painel/NewAppointmentForm";
import SubmitButton from "@/components/painel/SubmitButton";
import { Card, Chips, PageHeader, STATUS_STYLE } from "@/components/painel/ui";
import { createBlock, deleteBlock, markReminderSent } from "../../actions";
import type { AppointmentWithRefs, ClientPackage } from "@/lib/types";

export const metadata = { title: "Agenda" };

const ONE = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AgendaPage({ searchParams }: PageProps<"/painel/agenda">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();

  const d = ONE(sp.d) && /^\d{4}-\d{2}-\d{2}$/.test(ONE(sp.d)!) ? ONE(sp.d)! : today;
  const view = ONE(sp.view) === "dia" ? "dia" : "semana";
  const apptId = ONE(sp.a);
  const blockId = ONE(sp.bloqueio);
  const clientParam = ONE(sp.cliente);
  const showNew = ONE(sp.novo) === "1" || Boolean(clientParam);
  const showBlock = ONE(sp.bloquear) === "1";

  const monday = addDays(d, -((weekday(d) + 6) % 7));
  const from = view === "dia" ? d : monday;
  const to = view === "dia" ? d : addDays(monday, 6);
  const tomorrow = addDays(today, 1);

  const [appts, blocks, settings, services, clientsRes, packages, tomorrowAppts, drawerAppt] = await Promise.all([
    appointmentsBetween(supabase, from, to),
    blocksBetween(supabase, from, to),
    getSettings(supabase),
    listServices(supabase),
    showNew ? supabase.from("clients").select("id, name, phone").order("name") : Promise.resolve({ data: [] }),
    showNew || apptId ? activePackages(supabase) : Promise.resolve([] as ClientPackage[]),
    appointmentsBetween(supabase, tomorrow, tomorrow),
    apptId ? supabase.from("appointments").select(APPT_SELECT).eq("id", apptId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  let days = Array.from({ length: view === "dia" ? 1 : 7 }, (_, i) => addDays(from, i));
  if (view === "semana") days = days.filter((day) => weekday(day) !== 0 || appts.some((a) => dateSP(a.starts_at) === day));

  const params = { view, d } as Record<string, string>;
  const hrefFor = (extra: Record<string, string>) => `/painel/agenda?${new URLSearchParams({ ...params, ...extra })}`;
  const baseHref = hrefFor({});

  const active = appts.filter((a) => a.status !== "cancelado" && a.status !== "faltou");
  const expected = active.reduce((s, a) => s + Number(a.price), 0);
  const pending = appts.filter((a) => a.status === "solicitado");
  const reminders = tomorrowAppts.filter((a) => (a.status === "confirmado" || a.status === "solicitado") && !a.reminder_sent_at);

  // Ocupação: minutos atendidos / minutos abertos no período.
  let openMin = 0;
  for (const day of days) {
    const h = settings.business_hours[String(weekday(day)) as "0"];
    if (!h) continue;
    openMin += toMinutes(h.close) - toMinutes(h.open);
    if (h.break_start && h.break_end) openMin -= toMinutes(h.break_end) - toMinutes(h.break_start);
  }
  const bookedMin = active.reduce((s, a) => s + (Date.parse(a.ends_at) - Date.parse(a.starts_at)) / 60000, 0);
  const occupancy = openMin ? Math.round((bookedMin / openMin) * 100) : 0;

  const nowMin = toMinutes(fmtTime(new Date().toISOString()));
  const shift = view === "dia" ? 1 : 7;
  const drawerA = drawerAppt.data as AppointmentWithRefs | null;
  const drawerBlock = blockId ? blocks.find((b) => b.id === blockId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title={
          view === "dia"
            ? <>{fmtWeekday(d, "long")}, {fmtDate(d, { month: "long", year: undefined })}</>
            : <>Semana de {fmtDate(monday, { year: undefined })}</>
        }
        subtitle={`${active.length} atendimentos · ${brl(expected)} previstos · ocupação ${occupancy}%${pending.length ? ` · ${pending.length} a confirmar` : ""}`}
        actions={
          <>
            <Chips
              current={view}
              items={[
                { key: "dia", label: "Dia", href: `/painel/agenda?view=dia&d=${d}` },
                { key: "semana", label: "Semana", href: `/painel/agenda?view=semana&d=${d}` },
              ]}
            />
            <div className="flex items-center gap-1">
              <Link href={`/painel/agenda?view=${view}&d=${addDays(d, -shift)}`} className="p-btn-ghost" aria-label="Anterior"><ChevronLeft size={16} /></Link>
              <Link href={`/painel/agenda?view=${view}&d=${today}`} className="p-btn-ghost">Hoje</Link>
              <Link href={`/painel/agenda?view=${view}&d=${addDays(d, shift)}`} className="p-btn-ghost" aria-label="Próximo"><ChevronRight size={16} /></Link>
            </div>
            <form action="/painel/agenda" className="flex gap-1">
              <input type="hidden" name="view" value={view} />
              <input type="date" name="d" defaultValue={d} aria-label="Ir para data" className="p-input w-auto py-[7px]" />
              <button className="p-btn-ghost">Ir</button>
            </form>
            <Link href={hrefFor({ bloquear: "1" })} scroll={false} className="p-btn-ghost"><Lock size={14} /> Bloquear</Link>
            <Link href={hrefFor({ novo: "1" })} scroll={false} className="p-btn"><CalendarPlus size={14} /> Agendar</Link>
          </>
        }
      />

      <div className="grid xl:grid-cols-[1fr_300px] gap-5">
        <div className="min-w-0">
          <AgendaGrid
            days={days}
            appts={appts}
            blocks={blocks}
            hours={settings.business_hours}
            today={today}
            nowMin={nowMin}
            step={settings.slot_step_min}
            hrefFor={hrefFor}
          />
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#857566]">
            {(["solicitado", "confirmado", "concluido", "faltou", "cancelado"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background: STATUS_STYLE[s].bg, borderLeft: `3px solid ${STATUS_STYLE[s].bd}` }} />
                {{ solicitado: "A confirmar", confirmado: "Confirmado", concluido: "Concluído", faltou: "Faltou", cancelado: "Cancelado" }[s]}
              </span>
            ))}
            <span>· Clique num horário vazio para agendar</span>
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <Card title="A confirmar" eyebrow="Pedidos" gold bodyClassName="p-3">
            {pending.length === 0 ? (
              <p className="text-sm text-[#857566] text-center py-4">Nenhum pedido pendente neste período.</p>
            ) : (
              <div className="flex flex-col gap-2">{pending.map((a) => <AppointmentItem key={a.id} appt={a} showDate />)}</div>
            )}
          </Card>

          <Card title="Lembretes de amanhã" eyebrow={fmtDate(tomorrow, { year: undefined })} bodyClassName="p-3">
            {reminders.length === 0 ? (
              <p className="text-sm text-[#857566] text-center py-4">Tudo avisado. ✨</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {reminders.map((a) => {
                  const wa = whatsappLink(a.clients?.phone, fillTemplate(settings.templates.lembrete, {
                    nome: firstName(a.clients?.name ?? ""), servico: a.services?.name ?? "", data: fmtDate(tomorrow, { year: undefined }),
                    hora: fmtTime(a.starts_at), clinica: settings.clinic_name, link: `${SITE_URL}/meu-agendamento/${a.public_token}`,
                  }));
                  return (
                    <li key={a.id} className="flex items-center gap-2 rounded-xl bg-[#FEFBF7] border border-[#F3ECE0] px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate"><span className="p-num font-bold">{fmtTime(a.starts_at)}</span> {a.clients?.name}</p>
                        <p className="text-xs text-[#857566] truncate">{a.services?.name}</p>
                      </div>
                      {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm" aria-label="Enviar lembrete"><MessageCircle size={13} /></a>}
                      <form action={markReminderSent}>
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton className="p-btn-ghost p-btn-sm" title="Marcar como enviado"><BellRing size={13} /></SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {drawerA && (
        <Drawer title="Atendimento" eyebrow={drawerA.source === "site" ? "Agendado pelo site" : "Agendado no painel"} closeHref={baseHref}>
          <AppointmentPanel appt={drawerA} settings={settings} pkg={packages.find((p) => p.id === drawerA.client_package_id) ?? null} />
        </Drawer>
      )}

      {showNew && (
        <Drawer title="Novo agendamento" eyebrow="Agenda" closeHref={baseHref}>
          <NewAppointmentForm
            clients={clientsRes.data ?? []}
            services={services}
            packages={packages}
            defaultClientId={clientParam}
            defaultDate={ONE(sp.date) ?? (d < today ? today : d)}
            defaultTime={ONE(sp.time)}
          />
        </Drawer>
      )}

      {showBlock && (
        <Drawer title="Bloquear agenda" eyebrow="Folga, curso, compromisso" closeHref={baseHref}>
          <ActionForm action={createBlock} resetOnSuccess className="flex flex-col gap-3">
            <label>
              <span className="p-label">Motivo</span>
              <input name="reason" placeholder="Ex.: Curso, médico, folga" className="p-input" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label><span className="p-label">De</span><input type="date" name="date" required defaultValue={d} className="p-input" /></label>
              <label><span className="p-label">Até</span><input type="date" name="date_end" defaultValue={d} className="p-input" /></label>
              <label><span className="p-label">Início</span><input type="time" name="start" defaultValue="09:00" className="p-input" /></label>
              <label><span className="p-label">Fim</span><input type="time" name="end" defaultValue="12:00" className="p-input" /></label>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#6B5A4B]">
              <input type="checkbox" name="all_day" className="accent-[#82590F]" /> Dia inteiro
            </label>
            <p className="text-xs text-[#857566]">O site deixa de oferecer esses horários para agendamento.</p>
            <div><SubmitButton>Bloquear</SubmitButton></div>
          </ActionForm>
        </Drawer>
      )}

      {drawerBlock && (
        <Drawer title={drawerBlock.reason} eyebrow="Horário bloqueado" closeHref={baseHref}>
          <p className="text-sm text-[#6B5A4B] mb-4">
            {fmtDate(drawerBlock.starts_at)} {fmtTime(drawerBlock.starts_at)} até {fmtDate(drawerBlock.ends_at)} {fmtTime(drawerBlock.ends_at)}
          </p>
          <form action={deleteBlock}>
            <input type="hidden" name="id" value={drawerBlock.id} />
            <ConfirmButton confirmText="Remover bloqueio"><Trash2 size={13} /> Liberar horário</ConfirmButton>
          </form>
        </Drawer>
      )}
    </>
  );
}
