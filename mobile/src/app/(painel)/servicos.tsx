import { useQuery } from "@powersync/react-native";
import { brl } from "@shared/format";
import { SERVICE_ICONS, type ServiceIcon } from "@shared/site-content";
import { useState } from "react";
import { Text, View } from "react-native";
import { Badge, Button, Card, ConfirmButton, Empty, Field, ListItem, MoneyField, moneyText, parseMoney, Screen, Select, Sheet, Toggle, useToast } from "@/components/ui";
import { Font } from "@/constants/brand";
import { asBool } from "@/db/hooks";
import { write } from "@/db/write";

const CATEGORIES = { facial: "Facial", corporal: "Corporal", terapias: "Terapias", combo: "Combo" };
type Svc = { id: string; name: string; category: string; description: string | null; duration_min: number; price: number; return_days: number | null; active: number; show_on_home: number; icon: string };
const EMPTY = { id: "", name: "", category: "facial", price: "", duration: "60", returnDays: "", description: "", active: true, home: true, icon: "sparkles" };
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55);

/** Serviços da clínica: lista, criação, edição e exclusão (o histórico impede excluir). */
export default function Servicos() {
  const toast = useToast();
  const { data } = useQuery<Svc>("select * from services order by active desc, sort_order, name");
  const [f, setF] = useState<typeof EMPTY | null>(null);
  const unpriced = data.filter((s) => !s.price);
  const set = (p: Partial<typeof EMPTY>) => setF((cur) => cur && { ...cur, ...p });

  const edit = (s: Svc) => setF({
    id: s.id, name: s.name, category: s.category, price: moneyText(s.price), duration: String(s.duration_min), returnDays: s.return_days ? String(s.return_days) : "",
    description: s.description ?? "", active: asBool(s.active), home: asBool(s.show_on_home), icon: s.icon,
  });

  const save = async () => {
    if (!f) return;
    const price = parseMoney(f.price), duration = Number(f.duration), returnDays = Number(f.returnDays);
    const name = f.name.trim().slice(0, 120);
    if (name.length < 2) return toast("Informe o nome do serviço.", "error");
    if (!Number.isFinite(price) || price < 0) return toast("Informe um preço válido.", "error");
    if (!(duration >= 15 && duration <= 480)) return toast("Duração entre 15 e 480 minutos.", "error");
    if (data.some((s) => s.id !== f.id && slug(s.name) === slug(name))) return toast(`Já existe um serviço chamado “${name}”.`, "error");
    const ids = new Set(data.map((s) => s.id)), base = slug(name) || "servico";
    let id = f.id || base;
    for (let n = 2; !f.id && ids.has(id); n++) id = `${base}-${n}`;
    const row = {
      name, price, duration_min: duration, return_days: returnDays > 0 ? returnDays : null, category: f.category,
      description: f.description.trim().slice(0, 500) || null, active: f.active, show_on_home: f.home, icon: f.icon,
    };
    await write(async (w) => { if (f.id) await w.update("services", id, row); else await w.insert("services", { ...row, id, sort_order: 99 }); });
    toast(f.id ? "Serviço atualizado." : "Serviço criado.");
    setF(null);
  };

  const remove = async (id: string) => {
    const used = await write(async (w) => {
      const q = (t: string) => w.get<{ n: number }>(`select count(*) as n from ${t} where service_id = ?`, [id]);
      const n = (await Promise.all(["appointments", "packages", "client_packages"].map(q))).reduce((s, r) => s + (r?.n ?? 0), 0);
      if (!n) await w.remove("services", id);
      return n;
    });
    if (used) return toast("Este serviço já tem agendamentos ou pacotes no histórico e não pode ser excluído. Desmarque “Disponível no site” para escondê-lo.", "error");
    toast("Serviço excluído.");
    setF(null);
  };

  return (
    <Screen title="Serviços" subtitle="Preço, duração e retorno sugerido de cada tratamento. A duração define os horários livres no site." right={<Button icon="add" onPress={() => setF(EMPTY)}>Novo serviço</Button>}>
      {unpriced.length > 0 && (
        <View style={{ backgroundColor: "#FFF6DD", borderColor: "#EED9A0", borderWidth: 1, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontFamily: Font.body, fontSize: 14, color: "#7A5510", lineHeight: 21 }}>
            <Text style={{ fontFamily: Font.bold }}>Defina os preços: </Text>{unpriced.map((s) => s.name).join(", ")} ainda estão com valor R$ 0,00. No site, o valor aparece como “a combinar” até você preencher.
          </Text>
        </View>
      )}
      <Card title="Serviços" right={<Badge tone="gold">{data.length}</Badge>}>
        {data.length === 0 && <Empty text="Nenhum serviço cadastrado." />}
        {data.map((s) => (
          <ListItem key={s.id} title={s.name} subtitle={`${CATEGORIES[s.category as keyof typeof CATEGORIES] ?? s.category} · ${brl(s.price)} · ${s.duration_min} min${s.return_days ? ` · retorno em ${s.return_days} dias` : ""}`}
            right={asBool(s.active) ? undefined : <Badge>Inativo</Badge>} onPress={() => edit(s)} />
        ))}
      </Card>
      <Sheet visible={!!f} onClose={() => setF(null)} title={f?.id ? "Editar serviço" : "Novo serviço"}>
        {f && (
          <>
            <Field label="Nome" value={f.name} onChangeText={(name) => set({ name })} />
            <Select label="Categoria" value={f.category} onChange={(category) => set({ category })} options={Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))} />
            <MoneyField label="Preço (R$)" value={f.price} onChangeText={(price) => set({ price })} />
            <Field label="Duração (min, 15 a 480)" keyboardType="number-pad" value={f.duration} onChangeText={(duration) => set({ duration })} />
            <Field label="Retorno sugerido (dias)" hint="Quando a cliente deveria voltar. Deixe vazio se não houver." keyboardType="number-pad" value={f.returnDays} onChangeText={(returnDays) => set({ returnDays })} />
            <Field label="Descrição" multiline value={f.description} onChangeText={(description) => set({ description })} />
            <Select label="Ícone" value={f.icon as ServiceIcon} onChange={(icon) => set({ icon })} options={Object.entries(SERVICE_ICONS).map(([value, label]) => ({ value, label }))} />
            <Toggle label="Disponível no site" value={f.active} onChange={(active) => set({ active })} />
            <Toggle label="Mostrar na página inicial do site" value={f.home} onChange={(home) => set({ home })} />
            <Button onPress={save}>Salvar</Button>
            {!!f.id && <ConfirmButton onConfirm={() => remove(f.id)} small={false} />}
          </>
        )}
      </Sheet>
    </Screen>
  );
}
