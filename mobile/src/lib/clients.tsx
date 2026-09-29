import { useQuery, useStatus } from "@powersync/react-native";
import { addDays, digits, formatPhone, maskPhone, SOURCE_LABEL, STAGE_LABEL, whatsappLink } from "@shared/format";
import { cardFee } from "@shared/settings-core";
import type { AppointmentStatus, ClientStage, Settings } from "@shared/types";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Linking, View } from "react-native";
import { Button, Card, ConfirmButton, DateField, Field, Select, Toggle, type Tone, Txt, useToast } from "@/components/ui";
import { asBool, asList } from "@/db/hooks";
import { type Row as DbRow, write } from "@/db/write";
import { removeClientPhotos } from "@/lib/photo-sync";

export type ClientDb = {
  id: string; name: string; phone: string | null; email: string | null; birth_date: string | null; instagram: string | null;
  source: string; stage: string; tags: string | null; notes: string | null; skin_type: string | null; allergies: string | null;
  health_notes: string | null; marketing_opt_in: number; created_at: string; cpf: string | null; address: string | null;
  occupation: string | null; anamnesis: string | null; consent_signed_at: string | null;
};

/** Texto sem acento e em minúsculas, para buscas. */
export const norm = (t: string | null | undefined) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Converte um mapa de rótulos em opções de Select/Segmented. */
export const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));

/** Troca textos vazios por null (e apara espaços) antes de gravar. */
export const clean = (o: Record<string, DbRow[string]>): DbRow =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v.trim() || null : v]));

export const nowIso = () => new Date().toISOString();

/** Cores das etapas e situações (StageBadge/StatusBadge do painel). */
export const STAGE_TONE: Record<ClientStage, Tone> = { lead: "gold", em_contato: "blue", cliente: "green", vip: "plum", inativa: "gray" };
export const STATUS_TONE: Record<AppointmentStatus, Tone> = { solicitado: "gold", confirmado: "blue", concluido: "green", cancelado: "gray", faltou: "red" };

export type Appt = { id: string; starts_at: string; status: AppointmentStatus; price: number; service: string | null; client_package_id: string | null };
export const APPTS = "select a.id, a.starts_at, a.status, a.price, a.client_package_id, s.name service from appointments a left join services s on s.id = a.service_id where a.client_id = ?";

export const CLIENT_TABS = [
  { value: "resumo", label: "Resumo" }, { value: "anamnese", label: "Anamnese" }, { value: "evolucao", label: "Evolução" },
  { value: "fotos", label: "Fotos" }, { value: "pacotes", label: "Pacotes" }, { value: "historico", label: "Histórico & pagamentos" },
  { value: "crm", label: "Relacionamento" }, { value: "dados", label: "Dados" },
] as const;
export type ClientTab = (typeof CLIENT_TABS)[number]["value"];
export type TabProps = { c: ClientDb; go: (t: ClientTab) => void };

export const PKG_STATUS = { ativo: "Ativo", concluido: "Concluído", expirado: "Expirado", cancelado: "Cancelado" };
export type CPkg = { id: string; name: string; sessions_total: number; price: number; purchased_on: string; expires_on: string | null; status: keyof typeof PKG_STATUS; used: number; scheduled: number };
export const PKGS_SQL = `select cp.*, sum(case when a.status = 'concluido' then 1 else 0 end) used, sum(case when a.status in ('solicitado', 'confirmado') then 1 else 0 end) scheduled
  from client_packages cp left join appointments a on a.client_package_id = cp.id where cp.client_id = ? group by cp.id order by cp.purchased_on desc`;

/** Abre o WhatsApp da cliente com a mensagem. */
export const openWa = (phone: string | null, text: string) => { const url = whatsappLink(phone, text); if (url) Linking.openURL(url); };

/** Estado de formulário simples com setter por campo e reset. */
export function useForm<T extends object>(init: T) {
  const [f, setF] = useState(init);
  const set = <K extends keyof T>(k: K) => (v: T[K]) => setF((p) => ({ ...p, [k]: v }));
  return { f, set, reset: () => setF(init) };
}

/** Cadastro da cliente, reativo. */
export function useClient(id: string) {
  return useQuery<ClientDb>("select * from clients where id = ?", [id]).data[0];
}

/** Célula da grade de formulário do painel (3 colunas no tablet deitado, 2 em pé, 1 no celular); `full` ocupa a linha. */
const Cell = ({ children, span = 1, full }: { children: ReactNode; span?: number; full?: boolean }) => (
  <View style={full ? { width: "100%" } : { flexBasis: 230 * span + 12 * (span - 1), flexGrow: span, minWidth: 0 }}>{children}</View>
);

/** Cadastro/edição dos dados da cliente (mesmos campos e regras do painel); `onSaved` substitui o voltar após editar. */
export function ClientForm({ client: c, onSaved }: { client?: ClientDb; onSaved?: () => void }) {
  const toast = useToast();
  const { f, set } = useForm({
    name: c?.name ?? "", phone: formatPhone(c?.phone), email: c?.email ?? "", instagram: c?.instagram ?? "",
    birth_date: c?.birth_date ?? null, cpf: c?.cpf ?? "", address: c?.address ?? "", occupation: c?.occupation ?? "",
    stage: c?.stage ?? "cliente", source: c?.source ?? "instagram", tags: asList(c?.tags).join(", "), notes: c?.notes ?? "",
    marketing_opt_in: c ? asBool(c.marketing_opt_in) : true,
  });
  const save = async () => {
    if (f.name.trim().length < 2) return toast("Informe o nome da cliente.", "error");
    const row = clean({
      ...f, name: f.name.slice(0, 120), phone: digits(f.phone).slice(0, 13), email: f.email.toLowerCase(), cpf: digits(f.cpf),
      tags: f.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12),
    });
    if (c) {
      await write((w) => w.update("clients", c.id, row));
      toast("Dados salvos.");
      return onSaved ? onSaved() : router.back();
    }
    const id = await write((w) => w.insert("clients", { ...row, anamnesis: {}, created_at: nowIso() }));
    router.replace(`/clientes/${id}`);
  };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      <Cell span={2}><Field label="Nome completo *" value={f.name} onChangeText={set("name")} autoCapitalize="words" /></Cell>
      <Cell><Field label="WhatsApp" value={f.phone} onChangeText={(v) => set("phone")(maskPhone(v))} keyboardType="phone-pad" placeholder="(11) 99999-9999" /></Cell>
      <Cell><Field label="E-mail" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" /></Cell>
      <Cell><DateField label="Nascimento" value={f.birth_date} onChange={set("birth_date")} optional /></Cell>
      <Cell><Field label="CPF" value={f.cpf} onChangeText={set("cpf")} keyboardType="number-pad" placeholder="Para recibos e termo" /></Cell>
      <Cell><Field label="Instagram" value={f.instagram} onChangeText={set("instagram")} autoCapitalize="none" placeholder="@usuario" /></Cell>
      <Cell span={2}><Field label="Endereço" value={f.address} onChangeText={set("address")} /></Cell>
      <Cell><Field label="Profissão" value={f.occupation} onChangeText={set("occupation")} /></Cell>
      <Cell><Select label="Como conheceu" value={f.source} options={toOptions(SOURCE_LABEL)} onChange={set("source")} /></Cell>
      <Cell><Select label="Etapa no funil" value={f.stage} options={toOptions(STAGE_LABEL)} onChange={set("stage")} /></Cell>
      <Cell><Field label="Etiquetas" value={f.tags} onChangeText={set("tags")} placeholder="pele sensível, noivas" hint="Separe por vírgula." autoCapitalize="none" /></Cell>
      <Cell full><Field label="Observações" value={f.notes} onChangeText={set("notes")} multiline placeholder="Preferências, como gosta de ser atendida…" /></Cell>
      <Cell full><Toggle label="Aceita receber lembretes e promoções pelo WhatsApp (LGPD)" value={f.marketing_opt_in} onChange={set("marketing_opt_in")} /></Cell>
      <Cell full><Button icon={Check} style={{ alignSelf: "flex-start" }} onPress={save}>{c ? "Salvar dados" : "Cadastrar cliente"}</Button></Cell>
    </View>
  );
}

/** Zona de risco: exclui a cliente e, se on-line, as fotos do armazenamento (LGPD). */
export function DeleteClientCard({ id }: { id: string }) {
  const toast = useToast();
  const { connected } = useStatus();
  const remove = async () => {
    if (connected) await removeClientPhotos(id).catch(() => toast("Não foi possível remover as fotos do armazenamento.", "error"));
    await write((w) => w.remove("clients", id));
    toast("Cliente excluída.");
    router.dismissTo("/clientes");
  };
  return (
    <Card title="Excluir cliente" eyebrow="Zona de risco">
      <Txt.muted>Remove a cliente com agendamentos, prontuário, fotos e anotações (direito de exclusão da LGPD). Os lançamentos financeiros permanecem, sem vínculo.</Txt.muted>
      {!connected && <Txt.muted>Sem internet: as fotos no armazenamento só serão apagadas se você excluir com o aparelho on-line.</Txt.muted>}
      <View style={{ alignSelf: "flex-start" }}><ConfirmButton confirmText="Excluir definitivamente" onConfirm={remove}>Excluir cliente</ConfirmButton></View>
    </Card>
  );
}

type SaleInput = { price: number; purchased: string; installments: number; paidNow: boolean; method: string };
type PackageDb = { id: string; name: string; service_id: string; sessions: number; price: number; validity_days: number | null };

/** Vende um pacote num único lote: saldo de sessões e lançamentos à vista ou parcelados (igual ao sellPackage do painel). */
export function sellPackage(settings: Settings, clientId: string, pkg: PackageDb, s: SaleInput) {
  return write(async (w) => {
    const cpId = await w.insert("client_packages", {
      client_id: clientId, package_id: pkg.id, service_id: pkg.service_id, name: pkg.name, sessions_total: pkg.sessions,
      price: s.price, purchased_on: s.purchased, status: "ativo", created_at: nowIso(),
      expires_on: pkg.validity_days ? addDays(s.purchased, pkg.validity_days) : null,
    });
    const n = s.price > 0 ? s.installments : 0;
    const per = Math.floor((s.price / n) * 100) / 100;
    for (let i = 0; i < n; i++) {
      const amount = i === n - 1 ? Math.round((s.price - per * (n - 1)) * 100) / 100 : per;
      const due = addDays(s.purchased, 30 * i);
      const paid = s.paidNow && (i === 0 || s.method === "credito");
      await w.insert("transactions", {
        kind: "receita", category: "Pacotes", description: `${pkg.name}${n > 1 ? ` (${i + 1}/${n})` : ""}`, amount, method: s.method,
        fee: paid ? cardFee(settings, s.method, amount) : 0, status: paid ? "pago" : "pendente", occurred_on: paid ? s.purchased : due,
        due_on: due, client_id: clientId, client_package_id: cpId, created_at: nowIso(),
      });
    }
  });
}
