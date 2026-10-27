import { addDays, brl, digits, fmtDate, formatPhone, maskPhone, todaySP, weekday } from "@shared/format";
import { toTimestamp, WEEKDAY_NAMES } from "@shared/hours";
import { planSessions, REPEAT_MAX, REPEAT_PRESETS } from "@shared/repeat";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { CalendarPlus } from "lucide-react-native";
import { View } from "react-native";
import { Button, Chip, DateField, Field, MoneyField, moneyText, parseMoney, Row, Segmented, Select, TimeField, Toggle, Txt, useToast } from "@/components/ui";
import { useMe, useServices, useSettings } from "@/db/hooks";
import { newId, write } from "@/db/write";
import { DrawerScreen, Label, PKG_SQL, type Pkg, ts, useRows } from "@/lib/agenda";

const NEW = "__novo";
const box = { borderRadius: 12, borderWidth: 1, borderColor: "#F0E6D6", backgroundColor: "#FDFAF5", padding: 12 };

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/**
 * Novo agendamento: cliente existente ou nova, serviço, horário, valor, situação e sessão de pacote.
 * Opcionais: outros procedimentos no mesmo horário e repetição semanal (sessões do plano).
 */
export default function NewAppointment() {
  const p = useLocalSearchParams<{ date?: string; time?: string; client_id?: string }>();
  const toast = useToast();
  const services = useServices();
  const settings = useSettings();
  const isAdmin = useMe()?.isAdmin ?? false;
  const clients = useRows<{ id: string; name: string; phone: string | null }>("select id, name, phone from clients order by name");
  const [clientId, setClientId] = useState(p.client_id ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [date, setDate] = useState<string | null>(p.date ?? todaySP());
  const [time, setTime] = useState<string | null>(p.time ?? null);
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"confirmado" | "solicitado">("confirmado");
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatCount, setRepeatCount] = useState("");
  const service = services.find((s) => s.id === serviceId) ?? services.find((s) => s.active) ?? services[0];
  const pkgs = useRows<Pkg>(`${PKG_SQL} where cp.status = 'ativo' and cp.client_id = ?`, [clientId]).filter((k) => k.sessions_total - k.used - k.scheduled > 0);
  const pkg = pkgs.find((k) => k.id === packageId);
  const pkgLeft = pkg ? pkg.sessions_total - pkg.used - pkg.scheduled : null;
  const days = repeatDays.length ? repeatDays : [weekday(date ?? todaySP())];

  const pickService = (id: string) => {
    const s = services.find((x) => x.id === id);
    setServiceId(id); setDuration(String(s?.duration_min ?? "")); setPrice(moneyText(s?.price));
    if (pkgs.find((k) => k.id === packageId)?.service_id !== id) setPackageId("");
  };

  const save = async () => {
    if (!date || !time) return toast("Informe data e horário.", "error");
    if (!service) return toast("Escolha um serviço.", "error");
    if ((!clientId || clientId === NEW) && name.trim().length < 2) return toast("Escolha uma cliente ou informe o nome da nova cliente.", "error");
    const mins = Number(duration) || service.duration_min;
    const value = parseMoney(price);
    const now = new Date().toISOString();
    const wanted = repeat && isAdmin ? Math.min(Math.max(Number(repeatCount) || 1, 1), pkgLeft ?? REPEAT_MAX, REPEAT_MAX) : 1;
    let plan = { dates: [date], skipped: [] as string[] };
    const extraServices = services.filter((x) => extras.includes(x.id) && x.id !== service.id);
    try {
      await write(async (w) => {
        // Cliente nova com WhatsApp que já tem ficha: usa a ficha existente (o banco recusaria a duplicada).
        const tel = digits(phone).slice(0, 13) || null;
        const existing = clientId && clientId !== NEW ? null : tel ? await w.get<{ id: string }>("select id from clients where phone = ? limit 1", [tel]) : null;
        const cid = clientId && clientId !== NEW ? clientId
          : existing?.id ?? await w.insert("clients", { name: name.trim().slice(0, 120), phone: tel, stage: "em_contato", source: "whatsapp", created_at: now });
        if (wanted > 1) {
          // Horários já ocupados por outras clientes ou bloqueados (como o servidor recusaria), no próximo ano.
          const from = toTimestamp(date, "00:00");
          const until = toTimestamp(addDays(date, 367), "00:00");
          const busy = [
            ...await w.all<{ starts_at: string; ends_at: string }>(
              `select ${ts("starts_at")} as starts_at, ${ts("ends_at")} as ends_at from appointments where client_id <> ? and status in ('solicitado','confirmado','concluido')
               and datetime(starts_at) >= datetime(?) and datetime(starts_at) < datetime(?)`, [cid, from, until]),
            ...await w.all<{ starts_at: string; ends_at: string }>(
              `select ${ts("starts_at")} as starts_at, ${ts("ends_at")} as ends_at from time_blocks where datetime(ends_at) > datetime(?) and datetime(starts_at) < datetime(?)`, [from, until]),
          ];
          plan = planSessions({ date, time, duration: mins, weekdays: days, count: wanted, hours: settings.business_hours, busy });
        }
        const series = plan.dates.length > 1 ? newId() : null;
        const add = (serviceId: string, day: string, minutes: number, amount: number, pkgId: string | null, seriesId: string | null = null) => {
          const startsAt = toTimestamp(day, time);
          return w.insert("appointments", {
            series_id: seriesId,
            client_id: cid, service_id: serviceId, starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + minutes * 60_000).toISOString(),
            price: pkgId ? 0 : amount, notes: notes.trim().slice(0, 1000) || null, status,
            confirmed_at: status === "confirmado" ? now : null, client_package_id: pkgId, source: "painel", created_at: now,
          });
        };
        for (const day of plan.dates) await add(service.id, day, mins, Number.isFinite(value) ? value : service.price, packageId || null, series);
        for (const x of extraServices) await add(x.id, date, x.duration_min, x.price, null);
      });
    } catch {
      return toast("Não foi possível criar o agendamento.", "error");
    }
    const parts = [plan.dates.length > 1 ? `${plan.dates.length} sessões agendadas (até ${fmtDate(plan.dates[plan.dates.length - 1])})` : "Agendamento criado"];
    if (extraServices.length) parts.push(`${extraServices.length === 1 ? "1 procedimento opcional" : `${extraServices.length} procedimentos opcionais`} no mesmo horário`);
    if (repeat && plan.dates.length < wanted) parts.push("não havia horário livre para todas as sessões no próximo ano");
    if (plan.skipped.length) parts.push(`dias ocupados pulados: ${plan.skipped.slice(0, 6).map((d) => fmtDate(d, { year: undefined })).join(", ")}${plan.skipped.length > 6 ? "…" : ""}`);
    toast(`${parts.join("; ")}.`);
    router.back();
  };

  return (
    <DrawerScreen title="Novo agendamento" eyebrow="Agenda">
      <Select
        label="Cliente" searchable value={clientId || null} onChange={(v) => { setClientId(v); setPackageId(""); }}
        options={[{ value: NEW, label: "+ Nova cliente" }, ...clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone ? formatPhone(c.phone) : undefined }))]}
      />
      {clientId === NEW && (
        <Row wrap gap={12} style={box}>
          <Field label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="WhatsApp" value={phone} onChangeText={(v) => setPhone(maskPhone(v))} keyboardType="phone-pad" placeholder="(11) 99999-9999" />
        </Row>
      )}
      {pkgs.length > 0 && (
        <View style={box}>
          <Label>Usar sessão de pacote?</Label>
          <Segmented
            value={packageId} onChange={(v) => { const k = pkgs.find((x) => x.id === v); if (k) pickService(k.service_id); setPackageId(v); }}
            options={[{ value: "", label: "Não, cobrar avulso" }, ...pkgs.map((k) => ({ value: k.id, label: `${k.name} · restam ${k.sessions_total - k.used - k.scheduled} de ${k.sessions_total}` }))]}
          />
        </View>
      )}
      <Select
        label="Serviço" value={service?.id ?? null} onChange={pickService}
        options={services.map((s) => ({ value: s.id, label: `${s.name}${s.active ? "" : " (inativo)"}`, hint: `${s.duration_min} min · ${brl(s.price)}` }))}
      />
      <Row wrap gap={12}>
        <DateField label="Data" value={date} onChange={setDate} />
        <TimeField label="Horário" value={time} onChange={setTime} />
      </Row>
      <Row wrap gap={12}>
        <Field label="Duração (min)" keyboardType="number-pad" value={duration || String(service?.duration_min ?? "")} onChangeText={setDuration} />
        {packageId ? <Field label="Valor (R$)" value="Pacote" editable={false} /> : <MoneyField label="Valor (R$)" value={price || moneyText(service?.price)} onChangeText={setPrice} />}
      </Row>
      <View style={box}>
        <Label>{`Procedimentos opcionais no mesmo horário${extras.length ? ` · ${extras.length}` : ""}`}</Label>
        <Txt.muted>Para a mesma cliente fazer mais de um procedimento junto. Cada um entra na agenda com sua duração e valor.</Txt.muted>
        <Row wrap gap={6} style={{ marginTop: 8 }}>
          {services.filter((x) => x.active && x.id !== service?.id).map((x) => (
            <Chip key={x.id} label={`${x.name} · ${x.duration_min} min`} on={extras.includes(x.id)} onPress={() => setExtras(toggle(extras, x.id))} />
          ))}
        </Row>
      </View>
      {isAdmin && <View style={box}>
        <Toggle
          label="Repetir no mesmo horário (sessões do plano)" value={repeat}
          onChange={(v) => { setRepeat(v); if (!repeatCount) setRepeatCount(String(pkgLeft ?? REPEAT_PRESETS[0])); }}
          hint={repeat ? "Dias fechados, bloqueados ou ocupados por outra cliente são pulados; segue até completar as sessões." : undefined}
        />
        {repeat && (
          <View style={{ gap: 10, marginTop: 6 }}>
            <Label>{`Dias da semana · ${days.length}x por semana`}</Label>
            <Row wrap gap={6}>
              {WEEKDAY_NAMES.map((n, i) => <Chip key={n} label={n.slice(0, 3)} on={days.includes(i)} onPress={() => setRepeatDays(toggle(days, i))} />)}
            </Row>
            <Label>{`Total de sessões (contando esta)${pkgLeft !== null ? ` · o pacote tem ${pkgLeft}` : ""}`}</Label>
            <Row wrap gap={6} style={{ alignItems: "center" }}>
              {REPEAT_PRESETS.map((n) => <Chip key={n} label={String(n)} on={repeatCount === String(n)} onPress={() => setRepeatCount(String(n))} />)}
              <View style={{ width: 110 }}>
                <Field label="Outro" keyboardType="number-pad" value={repeatCount} onChangeText={setRepeatCount} />
              </View>
            </Row>
          </View>
        )}
      </View>}
      <Row wrap gap={12} style={{ alignItems: "flex-start" }}>
        <Select label="Situação" value={status} onChange={setStatus} options={[{ value: "confirmado", label: "Confirmado" }, { value: "solicitado", label: "A confirmar" }]} />
        <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      </Row>
      <Button icon={CalendarPlus} onPress={save} style={{ alignSelf: "flex-start" }}>Agendar</Button>
    </DrawerScreen>
  );
}
