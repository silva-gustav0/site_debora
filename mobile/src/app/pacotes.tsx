import { useQuery } from "@powersync/react-native";
import { brl, fmtDate } from "@shared/format";
import { useState } from "react";
import { Badge, Button, Card, Empty, Field, ListItem, MoneyField, moneyText, parseMoney, Screen, Section, Select, Sheet, Toggle, Txt, useToast } from "@/components/ui";
import { asBool, useServices } from "@/db/hooks";
import { write } from "@/db/write";

type Pkg = { id: string; name: string; service_id: string; sessions: number; price: number; validity_days: number | null; active: number; service_name: string | null };
type Sold = { id: string; name: string; sessions_total: number; price: number; status: string; expires_on: string | null; client_name: string | null; used: number };
const STATUS = ["ativo", "concluido", "expirado", "cancelado"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const EMPTY = { id: "", name: "", service_id: "", sessions: "10", price: "", validity: "", active: true };

/** Pacotes: catálogo (criar/editar) e pacotes vendidos com sessões usadas. */
export default function Pacotes() {
  const toast = useToast();
  const services = useServices(true);
  const { data: pkgs } = useQuery<Pkg>("select p.*, s.name as service_name from packages p left join services s on s.id = p.service_id order by p.active desc, p.name");
  const { data: sold } = useQuery<Sold>(
    "select cp.*, c.name as client_name, (select count(*) from appointments a where a.client_package_id = cp.id and a.status = 'concluido') as used from client_packages cp left join clients c on c.id = cp.client_id order by cp.purchased_on desc",
  );
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => f && { ...f, ...patch });

  const save = async () => {
    if (!form) return;
    const sessions = parseInt(form.sessions, 10);
    const price = parseMoney(form.price);
    const days = parseInt(form.validity, 10);
    if (form.name.trim().length < 2) return setError("Informe o nome do pacote.");
    if (!form.service_id) return setError("Escolha o serviço.");
    if (!(sessions >= 1 && sessions <= 100)) return setError("Número de sessões entre 1 e 100.");
    if (!Number.isFinite(price) || price < 0) return setError("Informe o preço.");
    const row = { name: form.name.trim(), service_id: form.service_id, sessions, price, validity_days: days > 0 ? days : null, active: form.active };
    await write(async (w) => {
      if (form.id) await w.update("packages", form.id, row);
      else await w.insert("packages", { ...row, created_at: new Date().toISOString() });
    });
    toast(form.id ? "Pacote atualizado." : "Pacote criado.");
    setForm(null);
  };
  const edit = (p?: Pkg) => {
    setError(null);
    setForm(p ? { id: p.id, name: p.name, service_id: p.service_id, sessions: String(p.sessions), price: moneyText(p.price), validity: p.validity_days ? String(p.validity_days) : "", active: asBool(p.active) } : { ...EMPTY });
  };

  return (
    <Screen title="Pacotes" back right={<Button small icon="add" onPress={() => edit()}>Novo</Button>}>
      <Section title="Catálogo">
        {pkgs.length === 0 ? <Empty icon="cube-outline" text="Nenhum pacote cadastrado." /> : pkgs.map((p) => (
          <ListItem
            key={p.id} title={p.name} onPress={() => edit(p)}
            subtitle={`${p.service_name ?? "—"} · ${p.sessions} sessões · ${brl(p.price)}${p.validity_days ? ` · ${p.validity_days} dias` : ""}`}
            right={<Badge tone={asBool(p.active) ? "green" : "gray"}>{asBool(p.active) ? "ativo" : "inativo"}</Badge>}
          />
        ))}
      </Section>
      <Section title="Pacotes vendidos">
        {sold.length === 0 ? <Empty text="Nenhum pacote vendido ainda." /> : sold.map((p) => (
          <Card key={p.id}>
            <Txt.strong>{p.client_name}</Txt.strong>
            <Txt.muted>{`${p.name} · ${p.used} de ${p.sessions_total} sessões · ${brl(p.price)}${p.expires_on ? ` · vence ${fmtDate(p.expires_on)}` : ""}`}</Txt.muted>
            <Select label="Situação" value={p.status} options={STATUS} onChange={(status) => write((w) => w.update("client_packages", p.id, { status }))} />
          </Card>
        ))}
      </Section>
      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar pacote" : "Novo pacote"}>
        {form && (
          <>
            <Field label="Nome" value={form.name} onChangeText={(name) => set({ name })} placeholder="Ex.: 10 sessões de drenagem" error={error} />
            <Select label="Serviço" value={form.service_id || null} options={services.map((s) => ({ value: s.id, label: s.name, hint: `avulso ${brl(s.price)}` }))} onChange={(service_id) => set({ service_id })} />
            <Field label="Sessões (1 a 100)" value={form.sessions} onChangeText={(sessions) => set({ sessions })} keyboardType="number-pad" />
            <MoneyField label="Preço (R$)" value={form.price} onChangeText={(price) => set({ price })} />
            <Field label="Validade (dias, opcional)" value={form.validity} onChangeText={(validity) => set({ validity })} keyboardType="number-pad" />
            <Toggle label="Pacote ativo" value={form.active} onChange={(active) => set({ active })} />
            <Button onPress={save}>Salvar pacote</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
