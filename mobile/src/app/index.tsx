import { useQuery, useStatus } from "@powersync/react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/constants/brand";
import { useSession } from "@/lib/session";

/** Início provisório (fase 1): mostra a sincronização e os conflitos. As telas do painel entram na fase 2. */
export default function Home() {
  const { session, signOut } = useSession();
  const sync = useStatus();
  const { data: counts } = useQuery<{ clients: number; appointments: number; pending: number }>(
    `select (select count(*) from clients) as clients,
            (select count(*) from appointments) as appointments,
            (select count(*) from ps_crud) as pending`,
  );
  const { data: conflicts } = useQuery<{ id: string; created_at: string; table_name: string; message: string }>(
    "select id, created_at, table_name, message from sync_conflicts order by created_at desc limit 20",
  );
  const c = counts[0];

  const syncLabel = !sync.connected
    ? "Sem conexão: trabalhando offline"
    : sync.dataFlowStatus.downloading || sync.dataFlowStatus.uploading ? "Sincronizando…" : "Sincronizado";

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>Clínica Débora Silva</Text>
        <Text style={s.title}>Olá!</Text>
        <Text style={s.muted}>{session?.user.email}</Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>{syncLabel}</Text>
          {sync.lastSyncedAt && <Text style={s.muted}>Última sincronização: {sync.lastSyncedAt.toLocaleString("pt-BR")}</Text>}
          {c && (
            <Text style={s.muted}>
              {c.clients} clientes · {c.appointments} agendamentos no aparelho
              {c.pending > 0 ? ` · ${c.pending} alterações aguardando envio` : ""}
            </Text>
          )}
        </View>

        {conflicts.length > 0 && (
          <View style={[s.card, { borderColor: Brand.danger }]}>
            <Text style={[s.cardTitle, { color: Brand.danger }]}>Alterações recusadas pelo servidor</Text>
            {conflicts.map((k) => (
              <Text key={k.id} style={s.muted}>• {k.message}</Text>
            ))}
          </View>
        )}

        <Pressable style={s.link} onPress={signOut}>
          <Text style={s.linkText}>Sair e apagar os dados deste aparelho</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Brand.cream },
  content: { padding: 24, gap: 12 },
  eyebrow: { color: Brand.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: "700" },
  title: { color: Brand.text, fontSize: 30, fontWeight: "600" },
  muted: { color: Brand.muted, fontSize: 14 },
  card: { backgroundColor: Brand.white, borderColor: Brand.line, borderWidth: 1, borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { color: Brand.text, fontSize: 17, fontWeight: "700" },
  link: { alignItems: "center", paddingVertical: 16 },
  linkText: { color: Brand.muted, fontSize: 14, textDecorationLine: "underline" },
});
