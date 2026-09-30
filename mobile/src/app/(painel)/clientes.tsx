import { useQuery } from "@powersync/react-native";
import { brl, digits, fmtDate, formatPhone, SOURCE_LABEL, STAGE_LABEL, todaySP } from "@shared/format";
import { RECURRENCE_META } from "@shared/recurrence";
import type { ClientStage } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { Download, MessageCircle, Search, UserPlus, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Avatar, Badge, Button, Card, Chip, Empty, ListItem, Row, Screen, Stat, useToast, useWide } from "@/components/ui";
import { cs, StatGrid, Table, T, useLandscape } from "@/components/client-ui";
import { Brand, Font } from "@/constants/brand";
import { norm, STAGE_TONE } from "@/lib/clients";
import { shareCsv } from "@/lib/export";
import { type Client, useClients } from "@/lib/reports";
import { type WaTarget, WhatsAppSheet } from "@/components/whatsapp-sheet";

/** Etiquetas visíveis na lista (a marca da importação fica só no filtro, para não repetir em todas as linhas). */
const shownTags = (c: { tags: string[] }) => c.tags.filter((t) => !t.startsWith("importado-"));
const PAGE = 60; // desenha a lista aos poucos (centenas de fichas deixam o tablet lento)

const SORTS = { nome: "Nome", recentes: "Cadastro recente", visitas: "Mais visitas", valor: "Maior valor", ultima: "Última visita" } as const;
type Sort = keyof typeof SORTS;
type Item = Client & { email: string | null; spent: number };

/** Ordena a lista como o painel (nome, cadastro, visitas, valor, última visita). */
const sorter = (sort: Sort) => (a: Item, b: Item) =>
  sort === "recentes" ? b.created_at.localeCompare(a.created_at)
  : sort === "visitas" ? Number(b.visits ?? 0) - Number(a.visits ?? 0)
  : sort === "valor" ? b.spent - a.spent
  : sort === "ultima" ? (b.last_visit ?? "").localeCompare(a.last_visit ?? "")
  : a.name.localeCompare(b.name, "pt-BR");

/** Lista de clientes: indicadores, busca, filtros em chips e tabela (tablet) ou lista (celular). */
export default function Clientes() {
  const toast = useToast();
  const wide = useWide();
  const landscape = useLandscape();
  const params = useLocalSearchParams<{ q?: string }>();
  const stats = useClients();
  const { data: spent } = useQuery<{ client_id: string; total: number }>("select client_id, sum(amount) as total from transactions where kind = 'receita' and status = 'pago' and client_id is not null group by client_id");
  const { data: emails } = useQuery<{ id: string; email: string | null }>("select id, email from clients");
  const all = useMemo<Item[]>(() => {
    const em = new Map(emails.map((e) => [e.id, e.email]));
    const sp = new Map(spent.map((s) => [s.client_id, Number(s.total)]));
    return stats.map((c) => ({ ...c, email: em.get(c.id) ?? null, spent: sp.get(c.id) ?? 0 }));
  }, [stats, emails, spent]);
  const [q, setQ] = useState(params.q ?? "");
  const [seen, setSeen] = useState(params.q);
  if (params.q !== seen) { setSeen(params.q); if (params.q !== undefined) setQ(params.q); }
  const [stage, setStage] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [birthdays, setBirthdays] = useState(false);
  const [sort, setSort] = useState<Sort>("nome");
  const [wa, setWa] = useState<WaTarget | null>(null);
  const [shown, setShown] = useState(PAGE);
  const today = todaySP();
  const month = today.slice(5, 7);
  const allTags = useMemo(() => [...new Set(all.flatMap((c) => c.tags))].sort(), [all]);
  const counts = all.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.stage]: (acc[c.stage] ?? 0) + 1 }), {});
  const nq = norm(q.trim());
  const dq = digits(q);
  const list = all.filter((c) =>
    (!stage || c.stage === stage) && (!tag || c.tags.includes(tag)) && (!birthdays || c.birth_date?.slice(5, 7) === month) &&
    (!nq || norm(c.name).includes(nq) || norm(c.email).includes(nq) || (dq.length >= 3 && (c.phone ?? "").includes(dq)) || c.tags.some((t) => norm(t).includes(nq))),
  ).sort(sorter(sort));
  const withVisits = all.filter((c) => Number(c.visits) > 0);
  const ltv = withVisits.length ? withVisits.reduce((s, c) => s + c.spent, 0) / withVisits.length : 0;
  const open = (id: string) => router.push(`/clientes/${id}`);

  /** Exporta as clientes filtradas na tela (mesmas colunas do painel). */
  const exportCsv = () => shareCsv(`clientes-${today}.csv`,
    ["Nome", "WhatsApp", "E-mail", "Nascimento", "Origem", "Etapa", "Etiquetas", "Visitas", "Última visita", "Total investido", "Recorrência", "Aceita mensagens", "Cadastro"],
    list.map((c) => [c.name, formatPhone(c.phone), c.email, c.birth_date ? fmtDate(c.birth_date) : "", SOURCE_LABEL[c.source], STAGE_LABEL[c.stage], c.tags.join(", "),
      Number(c.visits ?? 0), c.last_visit ? fmtDate(c.last_visit) : "", c.spent, RECURRENCE_META[c.recurrence.status].label, c.optIn ? "Sim" : "Não", fmtDate(c.created_at)]),
  ).catch(() => toast("Não foi possível exportar.", "error"));

  const stageBadge = (s: ClientStage) => <Badge tone={STAGE_TONE[s] ?? "gray"}>{STAGE_LABEL[s] ?? s}</Badge>;
  const nameCell = (c: Item) => (
    <Row gap={12}>
      <Avatar name={c.name} size={34} />
      <View style={{ flex: 1, gap: 3 }}>
        <T style={cs.bold} lines={1}>{c.name}</T>
        {shownTags(c).length > 0 && <Row wrap gap={4}>{shownTags(c).slice(0, 3).map((t) => <Badge key={t} tone="bronze">{t}</Badge>)}</Row>}
      </View>
    </Row>
  );
  // Ícone do WhatsApp: abre as sugestões de mensagem com o primeiro nome (sem abrir a ficha).
  const waBtn = (c: Item) => c.phone ? (
    <Pressable onPress={() => setWa(c)} hitSlop={8} accessibilityLabel={`WhatsApp de ${c.name}`} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#E9F8EF" }, pressed && { opacity: 0.6 }]}>
      <MessageCircle size={17} color="#1F8F4E" />
    </Pressable>
  ) : null;
  const page = list.slice(0, shown);
  const rec = (c: Item) => <Badge tone={RECURRENCE_META[c.recurrence.status].tone}>{RECURRENCE_META[c.recurrence.status].label}</Badge>;

  return (
    <Screen
      eyebrow="Cadastro" title="Clientes" subtitle="Cadastro, prontuário e histórico de cada cliente."
      right={<>
        <Button small variant="outline" icon={Download} onPress={exportCsv}>Exportar CSV</Button>
        <Button small icon={UserPlus} onPress={() => router.push("/clientes/nova")}>Nova cliente</Button>
      </>}
    >
      <StatGrid cols={4}>
        <Stat label="Cadastrados" value={String(all.length)} icon={Users} />
        <Stat label="Já atendidas" value={String(withVisits.length)} hint={all.length ? `${Math.round((withVisits.length / all.length) * 100)}% da base` : undefined} />
        <Stat label="Valor médio por cliente" value={brl(ltv)} hint="total investido (LTV)" />
        <Stat label="Novos no mês" value={String(all.filter((c) => c.created_at.slice(0, 7) === today.slice(0, 7)).length)} />
      </StatGrid>

      <View style={{ flexDirection: landscape ? "row" : "column", alignItems: landscape ? "center" : "stretch", gap: 12 }}>
        <View style={{ flex: landscape ? 1 : undefined, maxWidth: 448 }}>
          <View style={{ position: "absolute", left: 12, top: 13, zIndex: 1 }}><Search size={15} color="#A69885" /></View>
          <TextInput
            value={q} onChangeText={setQ} placeholder="Nome, telefone, e-mail ou etiqueta" placeholderTextColor={Brand.placeholder}
            accessibilityLabel="Buscar clientes" style={{ backgroundColor: Brand.white, borderColor: Brand.inputLine, borderWidth: 1, borderRadius: 10, paddingLeft: 36, paddingRight: 12, minHeight: 42, fontSize: 14, color: Brand.ink, fontFamily: Font.body }}
          />
        </View>
        <Row wrap gap={6} style={{ flexShrink: 1 }}>
          <Chip label={`Todas · ${all.length}`} on={!stage} onPress={() => setStage(null)} />
          {(Object.entries(STAGE_LABEL) as [ClientStage, string][]).map(([v, l]) => (
            <Chip key={v} label={`${l} · ${counts[v] ?? 0}`} on={stage === v} onPress={() => setStage(stage === v ? null : v)} />
          ))}
        </Row>
      </View>
      <Row wrap gap={6}>
        <Chip label="Aniversariantes do mês" on={birthdays} onPress={() => setBirthdays(!birthdays)} />
        {allTags.map((t) => <Chip key={t} label={`#${t}`} on={tag === t} onPress={() => setTag(tag === t ? null : t)} />)}
      </Row>

      <Card bodyStyle={{ padding: 0, gap: 0 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Brand.lineSoft }}>
          <Text style={cs.small}>{list.length} {list.length === 1 ? "cliente" : "clientes"}</Text>
          <Row wrap gap={8}>
            <Text style={cs.small}>Ordenar:</Text>
            {(Object.entries(SORTS) as [Sort, string][]).map(([k, l]) => (
              <Pressable key={k} onPress={() => setSort(k)} hitSlop={6}><Text style={[cs.small, k === sort && { fontFamily: Font.bold, color: Brand.ink }]}>{l}</Text></Pressable>
            ))}
          </Row>
        </View>
        {list.length === 0 ? <Empty icon={Users} text={all.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."} />
        : wide ? (
          <Table
            minWidth={860}
            columns={[{ label: "Cliente", flex: 2.2 }, { label: "WhatsApp", flex: 1.5 }, { label: "Etapa", flex: 1.1 }, { label: "Visitas", flex: 0.9, right: true },
              { label: "Última visita", flex: 1.3 }, { label: "Investido", flex: 1.1, right: true }, { label: "Retorno", flex: 1.5 }, { label: "", flex: 0.6, right: true }]}
            rows={page.map((c) => ({
              key: c.id, onPress: () => open(c.id),
              cells: [nameCell(c), formatPhone(c.phone) || "—", stageBadge(c.stage), String(c.visits ?? 0), fmtDate(c.last_visit), brl(c.spent), rec(c), waBtn(c)],
            }))}
          />
        ) : (
          <View style={{ padding: 10, gap: 8 }}>
            {page.map((c) => (
              <ListItem key={c.id} title={c.name} subtitle={[formatPhone(c.phone), shownTags(c).slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
                left={<Avatar name={c.name} />} right={<Row gap={8}>{stageBadge(c.stage)}{waBtn(c)}</Row>} onPress={() => open(c.id)} />
            ))}
          </View>
        )}
        {list.length > shown && (
          <View style={{ padding: 12, alignItems: "center" }}>
            <Button small variant="outline" onPress={() => setShown(shown + PAGE)}>{`Mostrar mais (${list.length - shown} restantes)`}</Button>
          </View>
        )}
      </Card>
      <WhatsAppSheet client={wa} onClose={() => setWa(null)} />
    </Screen>
  );
}
