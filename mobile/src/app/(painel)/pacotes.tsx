import { useQuery } from "@powersync/react-native";
import { brl, diffDays, fmtDate, todaySP } from "@shared/format";
import { Package, Plus } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { Progress, Split } from "@/components/charts";
import { Avatar, Badge, Button, Card, Empty, Field, MoneyField, moneyText, parseMoney, Row, Screen, Segmented, Select, Sheet, Stat, Toggle, useToast, useWide } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { asBool, useServices } from "@/db/hooks";
import { save, write } from "@/db/write";

type Pkg = { id: string; name: string; service_id: string; sessions: number; price: number; validity_days: number | null; active: number; service_name: string | null };
type Sold = { id: string; name: string; sessions_total: number; price: number; status: string; expires_on: string | null; purchased_on: string; client_name: string | null; used: number };
const STATUS = ["ativo", "concluido", "expirado", "cancelado"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const FILTERS = [{ value: "ativos", label: "Ativos" }, { value: "vencendo", label: "Acabando ou vencendo" }, { value: "encerrados", label: "Encerrados" }];
const EMPTY = { id: "", name: "", service_id: "", sessions: "10", price: "", validity: "", active: true };

/** Pacotes: catálogo (criar/editar) e pacotes vendidos com sessões usadas. */
export default function Pacotes() {
  const toast = useToast();
  const wide = useWide();
  const [filter, setFilter] = useState("ativos");
  const services = useServices(true);
  const { data: pkgs } = useQuery<Pkg>("select p.*, s.name as service_name from packages p left join services s on s.id = p.service_id order by p.active desc, p.name");
  const { data: sold } = useQuery<Sold>(
    "select cp.*, c.name as client_name, (select count(*) from appointments a where a.client_package_id = cp.id and a.status = 'concluido') as used from client_packages cp left join clients c on c.id = cp.client_id order by cp.purchased_on desc",
  );
  const [form, setForm] = useState<typeof EMPTY | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<typeof EMPTY>) => setForm((f) => f && { ...f, ...patch });

  const submit = async () => {
    if (!form) return;
    const sessions = parseInt(form.sessions, 10);
    const price = parseMoney(form.price);
    const days = parseInt(form.validity, 10);
    if (form.name.trim().length < 2) return setError("Informe o nome do pacote.");
    if (!form.service_id) return setError("Escolha o serviço.");
    if (!(sessions >= 1 && sessions <= 100)) return setError("Número de sessões entre 1 e 100.");
    if (!Number.isFinite(price) || price < 0) return setError("Informe o preço.");
    const row = { name: form.name.trim(), service_id: form.service_id, sessions, price, validity_days: days > 0 ? days : null, active: form.active };
    if (!await save(toast, write(async (w) => {
      if (form.id) await w.update("packages", form.id, row);
      else await w.insert("packages", { ...row, created_at: new Date().toISOString() });
    }))) return;
    toast(form.id ? "Pacote atualizado." : "Pacote criado.");
    setForm(null);
  };
  const edit = (p?: Pkg) => {
    setError(null);
    setForm(p ? { id: p.id, name: p.name, service_id: p.service_id, sessions: String(p.sessions), price: moneyText(p.price), validity: p.validity_days ? String(p.validity_days) : "", active: asBool(p.active) } : { ...EMPTY });
  };

  const today = todaySP();
  const left = (p: Sold) => p.sessions_total - p.used;
  const active = sold.filter((p) => p.status === "ativo");
  const expiring = active.filter((p) => (p.expires_on && diffDays(today, p.expires_on) <= 30) || left(p) <= 1);
  const list = filter === "ativos" ? active : filter === "vencendo" ? expiring : sold.filter((p) => p.status !== "ativo");
  const soldMonth = sold.filter((p) => p.purchased_on.startsWith(today.slice(0, 7)));
  const pendingSessions = active.reduce((n, p) => n + left(p), 0);
  const deferred = active.reduce((n, p) => n + (p.price / p.sessions_total) * left(p), 0);

  return (
    <Screen
      eyebrow="Gestão" title="Pacotes de sessões" subtitle="Venda pacotes, acompanhe o saldo de sessões e a validade." back
      right={<Button small variant="outline" icon={Plus} onPress={() => edit()}>Novo pacote</Button>}
    >
      <Row wrap gap={12}>
        <Stat icon={Package} label="Pacotes ativos" value={String(active.length)} />
        <Stat label="Sessões a realizar" value={String(pendingSessions)} hint="saldo dos clientes" />
        <Stat label="Receita a executar" value={brl(deferred)} hint="já recebida, sessões pendentes" />
        <Stat label="Vendidos no mês" value={String(soldMonth.length)} hint={brl(soldMonth.reduce((n, p) => n + p.price, 0))} />
      </Row>
      <Split
        ratio={2.4}
        left={
          <Card bodyStyle={{ padding: 0, gap: 0 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft }}><Segmented value={filter} options={FILTERS.map((f) => ({ ...f, label: `${f.label}${f.value === "ativos" ? ` · ${active.length}` : f.value === "vencendo" ? ` · ${expiring.length}` : ""}` }))} onChange={setFilter} /></View>
            {list.length === 0 ? <Empty icon={Package} text="Nenhum pacote nesta lista." /> : list.map((p) => {
              const days = p.expires_on ? diffDays(today, p.expires_on) : null;
              return (
                <View key={p.id} style={[{ padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft }, wide && { flexDirection: "row", alignItems: "center" }]}>
                  <Row style={wide ? { width: 220 } : undefined} gap={12}>
                    <Avatar name={p.client_name ?? "?"} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Font.bold, fontSize: 14, color: Brand.ink }} numberOfLines={1}>{p.client_name}</Text>
                      <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }} numberOfLines={1}>{p.name}</Text>
                    </View>
                  </Row>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Row style={{ justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }}>{p.used} de {p.sessions_total} sessões</Text>
                      <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }}>{brl(p.price)}</Text>
                    </Row>
                    <Progress value={p.used} max={p.sessions_total} color={left(p) <= 1 ? Brand.gold : "#9A6F1E"} />
                  </View>
                  <View style={[{ gap: 8 }, wide && { width: 190, alignItems: "flex-end" }]}>
                    {p.status !== "ativo" ? <Badge tone="gray">{p.status}</Badge>
                      : days !== null && days < 0 ? <Badge tone="red">vencido</Badge>
                      : days !== null && days <= 30 ? <Badge tone="gold">{`vence ${fmtDate(p.expires_on, { year: undefined })}`}</Badge>
                      : <Badge tone="green">{`${left(p)} restantes`}</Badge>}
                    <Select label="Situação" value={p.status} options={STATUS} onChange={(status) => save(toast, write((w) => w.update("client_packages", p.id, { status })))} />
                  </View>
                </View>
              );
            })}
          </Card>
        }
        right={
          <Card title="Catálogo" eyebrow="Pacotes à venda" bodyStyle={{ padding: 12 }}>
            {pkgs.length === 0 ? <Empty icon={Package} text="Crie seu primeiro pacote." /> : pkgs.map((p) => {
              const full = (services.find((s) => s.id === p.service_id)?.price ?? 0) * p.sessions;
              const off = full > 0 ? Math.round((1 - p.price / full) * 100) : 0;
              return (
                <Card key={p.id} onPress={() => edit(p)} style={{ borderRadius: 12, shadowOpacity: 0, elevation: 0, opacity: asBool(p.active) ? 1 : 0.6 }} bodyStyle={{ padding: 14, gap: 2 }}>
                  <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Text style={{ flex: 1, fontFamily: Font.bold, fontSize: 14, color: Brand.ink }}>{p.name}</Text>
                    <Text style={{ fontFamily: Font.body, fontSize: 14, color: Brand.ink }}>{brl(p.price)}</Text>
                  </Row>
                  <Text style={{ fontFamily: Font.body, fontSize: 12, color: Brand.muted }}>
                    {`${p.sessions} sessões · ${brl(p.price / p.sessions)}/sessão`}{off > 0 && <Text style={{ fontFamily: Font.bold, color: "#1F6B3A" }}>{` · ${off}% off`}</Text>}{`${p.validity_days ? ` · ${p.validity_days} dias` : ""}${asBool(p.active) ? "" : " · inativo"}`}
                  </Text>
                </Card>
              );
            })}
          </Card>
        }
      />
      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar pacote" : "Novo pacote"}>
        {form && (
          <>
            <Field label="Nome" value={form.name} onChangeText={(name) => set({ name })} placeholder="Ex.: 10 sessões de drenagem" error={error} />
            <Select label="Serviço" value={form.service_id || null} options={services.map((s) => ({ value: s.id, label: s.name, hint: `avulso ${brl(s.price)}` }))} onChange={(service_id) => set({ service_id })} />
            <Field label="Sessões (1 a 100)" value={form.sessions} onChangeText={(sessions) => set({ sessions })} keyboardType="number-pad" />
            <MoneyField label="Preço (R$)" value={form.price} onChangeText={(price) => set({ price })} />
            <Field label="Validade (dias, opcional)" value={form.validity} onChangeText={(validity) => set({ validity })} keyboardType="number-pad" />
            <Toggle label="Pacote ativo" value={form.active} onChange={(active) => set({ active })} />
            <Button onPress={submit}>Salvar pacote</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
}
