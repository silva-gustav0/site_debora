import { useQuery } from "@powersync/react-native";
import { digits, fmtDate, formatPhone, SOURCE_LABEL, STAGE_LABEL, todaySP } from "@shared/format";
import { RECURRENCE_META } from "@shared/recurrence";
import type { ClientStage } from "@shared/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, TextInput } from "react-native";
import { Avatar, Badge, Button, Chip, Empty, ListItem, Row, Screen, Txt, useToast } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { asList } from "@/db/hooks";
import { type ClientDb, norm } from "@/lib/clients";
import { shareCsv } from "@/lib/export";
import { useClients } from "@/lib/reports";

type Item = Pick<ClientDb, "id" | "name" | "phone" | "email" | "stage" | "birth_date"> & { tags: string[] };

/** Lista de clientes com busca, filtros por etapa/etiqueta/aniversário e contagem. */
export default function Clientes() {
  const toast = useToast();
  const stats = useClients();
  const { data: spent } = useQuery<{ client_id: string; total: number }>("select client_id, sum(amount) as total from transactions where kind = 'receita' and status = 'pago' and client_id is not null group by client_id");
  const { data } = useQuery<ClientDb>("select id, name, phone, email, stage, tags, birth_date from clients order by name collate nocase");
  const all = useMemo<Item[]>(() => data.map((c) => ({ ...c, tags: asList(c.tags) })), [data]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [birthdays, setBirthdays] = useState(false);
  const month = todaySP().slice(5, 7);
  const allTags = useMemo(() => [...new Set(all.flatMap((c) => c.tags))].sort(), [all]);
  const counts = all.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.stage]: (acc[c.stage] ?? 0) + 1 }), {});
  const nq = norm(q.trim());
  const dq = digits(q);
  const list = all.filter((c) =>
    (!stage || c.stage === stage) && (!tag || c.tags.includes(tag)) && (!birthdays || c.birth_date?.slice(5, 7) === month) &&
    (!nq || norm(c.name).includes(nq) || norm(c.email).includes(nq) || (dq.length >= 3 && (c.phone ?? "").includes(dq)) || c.tags.some((t) => norm(t).includes(nq))));

  /** Exporta as clientes filtradas na tela (mesmas colunas do painel). */
  const exportCsv = () => {
    const by = new Map(stats.map((s) => [s.id, s]));
    const total = new Map(spent.map((s) => [s.client_id, Number(s.total)]));
    shareCsv(`clientes-${todaySP()}.csv`,
      ["Nome", "WhatsApp", "E-mail", "Nascimento", "Origem", "Etapa", "Etiquetas", "Visitas", "Última visita", "Total investido", "Recorrência", "Aceita mensagens", "Cadastro"],
      list.map((c) => {
        const s = by.get(c.id);
        return [c.name, formatPhone(c.phone), c.email, c.birth_date ? fmtDate(c.birth_date) : "", s ? SOURCE_LABEL[s.source] : "", STAGE_LABEL[c.stage as ClientStage], c.tags.join(", "),
          Number(s?.visits ?? 0), s?.last_visit ? fmtDate(s.last_visit) : "", total.get(c.id) ?? 0, s ? RECURRENCE_META[s.recurrence.status].label : "", s?.optIn ? "Sim" : "Não", s ? fmtDate(s.created_at) : ""];
      })).catch(() => toast("Não foi possível exportar.", "error"));
  };

  return (
    <Screen title="Clientes" scroll={false} right={<Button small icon="person-add" onPress={() => router.push("/clientes/nova")}>Nova cliente</Button>}>
      <FlatList
        data={list} keyExtractor={(c) => c.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            <TextInput
              value={q} onChangeText={setQ} placeholder="Nome, telefone, e-mail ou etiqueta" placeholderTextColor={Brand.muted}
              style={{ backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, color: Brand.text }}
            />
            <Row wrap style={{ marginVertical: 10 }}>
              <Chip label={`Todas · ${all.length}`} on={!stage} onPress={() => setStage(null)} />
              {(Object.entries(STAGE_LABEL) as [ClientStage, string][]).map(([v, l]) => (
                <Chip key={v} label={`${l} · ${counts[v] ?? 0}`} on={stage === v} onPress={() => setStage(stage === v ? null : v)} />
              ))}
              <Chip label="Aniversariantes do mês" on={birthdays} onPress={() => setBirthdays(!birthdays)} />
              {allTags.map((t) => <Chip key={t} label={`#${t}`} on={tag === t} onPress={() => setTag(tag === t ? null : t)} />)}
            </Row>
            <Row style={{ justifyContent: "space-between", marginBottom: 4 }}>
              <Txt.muted>{list.length} {list.length === 1 ? "cliente" : "clientes"}</Txt.muted>
              <Button small variant="outline" icon="download-outline" onPress={exportCsv}>Exportar CSV</Button>
            </Row>
          </>
        }
        ListEmptyComponent={<Empty icon="people-outline" text={all.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado."} />}
        renderItem={({ item: c }) => (
          <ListItem
            title={c.name} subtitle={[formatPhone(c.phone), c.tags.slice(0, 3).join(", ")].filter(Boolean).join(" · ")}
            left={<Avatar name={c.name} />} right={<Badge tone="bronze">{STAGE_LABEL[c.stage as ClientStage] ?? c.stage}</Badge>}
            onPress={() => router.push(`/clientes/${c.id}`)}
          />
        )}
      />
    </Screen>
  );
}
