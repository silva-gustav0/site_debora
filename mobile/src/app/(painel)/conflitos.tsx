import { useQuery, useStatus } from "@powersync/react-native";
import { fmtDate, fmtTime } from "@shared/format";
import { Badge, Card, ConfirmButton, Empty, Screen, Txt, useToast } from "@/components/ui";
import { Brand } from "@/constants/brand";
import { ts } from "@/lib/agenda";
import { encryptionVersion } from "@/db/database";
import { save, write } from "@/db/write";

type Conflict = { id: string; created_at: string; table_name: string; operation: string; data: string | null; message: string };

/** Estado da sincronização e alterações que o servidor recusou (dispensar apaga só do aparelho). */
export default function Conflitos() {
  const toast = useToast();
  const sync = useStatus();
  const { data } = useQuery<Conflict>(`select id, ${ts("created_at")} as created_at, table_name, operation, data, message from sync_conflicts order by datetime(created_at) desc`);
  const { data: [pending] } = useQuery<{ n: number }>("select count(*) as n from ps_crud");
  const state = !sync.connected ? "Sem conexão: trabalhando offline" : sync.dataFlowStatus.downloading || sync.dataFlowStatus.uploading ? "Sincronizando…" : "Sincronizado";
  const dismiss = (ids: string[]) => save(toast, write(async (w) => { for (const id of ids) await w.remove("sync_conflicts", id); }));

  return (
    <Screen eyebrow="Sistema" title="Sincronização" subtitle="Estado da sincronização e alterações recusadas pelo servidor">
      <Card title={state} right={<Badge tone={sync.connected ? "green" : "gray"}>{sync.connected ? "Online" : "Offline"}</Badge>}>
        {sync.lastSyncedAt && <Txt.muted>Última sincronização: {fmtDate(sync.lastSyncedAt)} às {fmtTime(sync.lastSyncedAt.toISOString())}</Txt.muted>}
        {!!pending?.n && <Txt.muted>{pending.n} alterações aguardando envio.</Txt.muted>}
        {encryptionVersion()
          ? <Txt.muted>Dados do aparelho criptografados (SQLCipher {encryptionVersion()}).</Txt.muted>
          : <Txt.muted style={{ color: Brand.danger }}>Atenção: o banco deste aparelho não está criptografado. Avise o suporte.</Txt.muted>}
      </Card>
      {data.length === 0 ? <Empty text="Nenhum conflito. Tudo o que foi feito neste aparelho foi aceito pelo servidor." /> : (
        <>
          <Txt.muted>O servidor recusou estas alterações (por exemplo, horário ocupado por outro aparelho) e o aparelho voltou ao estado do servidor. Refaça o que for preciso.</Txt.muted>
          {data.map((c) => (
            <Card key={c.id} title={c.message} eyebrow={`${fmtDate(c.created_at)} ${fmtTime(c.created_at)} · ${c.table_name}`} right={<Badge tone="red">{c.operation}</Badge>}>
              {!!c.data && <Txt.muted>{c.data.slice(0, 400)}</Txt.muted>}
              <ConfirmButton confirmText="Dispensar" onConfirm={() => dismiss([c.id])}>Dispensar</ConfirmButton>
            </Card>
          ))}
          {data.length > 1 && <ConfirmButton confirmText="Dispensar todos" onConfirm={() => dismiss(data.map((c) => c.id))} small={false}>Dispensar todos</ConfirmButton>}
        </>
      )}
    </Screen>
  );
}
