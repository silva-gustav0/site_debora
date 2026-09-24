import { getBookingByToken } from "@/app/actions/public";

const icsDate = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Arquivo .ics para a cliente adicionar o horário na agenda do celular. */
export async function GET(_req: Request, ctx: RouteContext<"/meu-agendamento/[token]/ics">) {
  const { token } = await ctx.params;
  const b = await getBookingByToken(token);
  if (!b) return new Response("Não encontrado", { status: 404 });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clinica Debora Silva//Agenda//PT-BR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.token}@clinica-debora-silva`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(b.startsAt)}`,
    `DTEND:${icsDate(b.endsAt)}`,
    `SUMMARY:${esc(`${b.serviceName} · ${b.clinicName}`)}`,
    `LOCATION:${esc(b.address)}`,
    `DESCRIPTION:${esc("Para remarcar, fale conosco pelo WhatsApp.")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(b.serviceName)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="agendamento-clinica-debora-silva.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
