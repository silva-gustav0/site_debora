import { brl, digits, formatPhone, maskPhone, todaySP } from "@shared/format";
import { toTimestamp } from "@shared/hours";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, Card, DateField, Field, MoneyField, moneyText, parseMoney, Row, Screen, Segmented, Select, TimeField, useToast } from "@/components/ui";
import { useServices } from "@/db/hooks";
import { write } from "@/db/write";
import { PKG_SQL, type Pkg, useRows } from "@/lib/agenda";

const NEW = "__novo";

/** Novo agendamento: cliente existente ou nova, serviço, horário, valor, situação e sessão de pacote. */
export default function NewAppointment() {
  const p = useLocalSearchParams<{ date?: string; time?: string; client_id?: string }>();
  const toast = useToast();
  const services = useServices();
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
  const service = services.find((s) => s.id === serviceId) ?? services.find((s) => s.active) ?? services[0];
  const pkgs = useRows<Pkg>(`${PKG_SQL} where cp.status = 'ativo' and cp.client_id = ?`, [clientId]).filter((k) => k.sessions_total - k.used - k.scheduled > 0);

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
    const startsAt = toTimestamp(date, time);
    const now = new Date().toISOString();
    try {
      await write(async (w) => {
        const cid = clientId && clientId !== NEW ? clientId
          : await w.insert("clients", { name: name.trim().slice(0, 120), phone: digits(phone).slice(0, 13) || null, stage: "em_contato", source: "whatsapp", created_at: now });
        await w.insert("appointments", {
          client_id: cid, service_id: service.id, starts_at: startsAt, ends_at: new Date(Date.parse(startsAt) + mins * 60_000).toISOString(),
          price: packageId ? 0 : Number.isFinite(value) ? value : service.price, notes: notes.trim().slice(0, 1000) || null, status,
          confirmed_at: status === "confirmado" ? now : null, client_package_id: packageId || null, source: "painel", created_at: now,
        });
      });
    } catch {
      return toast("Não foi possível criar o agendamento.", "error");
    }
    toast("Agendamento criado.");
    router.back();
  };

  return (
    <Screen title="Novo agendamento" back>
      <Select
        label="Cliente" searchable value={clientId || null} onChange={(v) => { setClientId(v); setPackageId(""); }}
        options={[{ value: NEW, label: "+ Nova cliente" }, ...clients.map((c) => ({ value: c.id, label: c.name, hint: c.phone ? formatPhone(c.phone) : undefined }))]}
      />
      {clientId === NEW && (
        <Row wrap>
          <Field label="Nome" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="WhatsApp" value={phone} onChangeText={(v) => setPhone(maskPhone(v))} keyboardType="phone-pad" placeholder="(11) 99999-9999" />
        </Row>
      )}
      {pkgs.length > 0 && (
        <Card eyebrow="Usar sessão de pacote?">
          <Segmented
            value={packageId} onChange={(v) => { const k = pkgs.find((x) => x.id === v); if (k) pickService(k.service_id); setPackageId(v); }}
            options={[{ value: "", label: "Não, cobrar avulso" }, ...pkgs.map((k) => ({ value: k.id, label: `${k.name} · restam ${k.sessions_total - k.used - k.scheduled} de ${k.sessions_total}` }))]}
          />
        </Card>
      )}
      <Select
        label="Serviço" value={service?.id ?? null} onChange={pickService}
        options={services.map((s) => ({ value: s.id, label: `${s.name}${s.active ? "" : " (inativo)"}`, hint: `${s.duration_min} min · ${brl(s.price)}` }))}
      />
      <Row wrap>
        <DateField label="Data" value={date} onChange={setDate} />
        <TimeField label="Horário" value={time} onChange={setTime} />
      </Row>
      <Row wrap>
        <Field label="Duração (min)" keyboardType="number-pad" value={duration || String(service?.duration_min ?? "")} onChangeText={setDuration} />
        {packageId ? <Field label="Valor (R$)" value="Pacote" editable={false} /> : <MoneyField label="Valor (R$)" value={price || moneyText(service?.price)} onChangeText={setPrice} />}
      </Row>
      <Segmented value={status} onChange={setStatus} options={[{ value: "confirmado", label: "Confirmado" }, { value: "solicitado", label: "A confirmar" }]} />
      <Field label="Observações" value={notes} onChangeText={setNotes} placeholder="Opcional" />
      <Button icon="calendar" onPress={save}>Agendar</Button>
    </Screen>
  );
}
