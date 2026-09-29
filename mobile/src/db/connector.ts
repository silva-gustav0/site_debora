import {
  type AbstractPowerSyncDatabase, type CrudEntry, type PowerSyncBackendConnector, UpdateType,
} from "@powersync/react-native";
import { POWERSYNC_URL, supabase } from "@/lib/supabase";
import { JSON_COLUMNS } from "./schema";

/** Erros de regra ou de dados (Postgres): tentar de novo não resolve, então viram conflito para a equipe ver. */
const FATAL = /^(22|23|42|P0)/;

const OP: Record<UpdateType, "PUT" | "PATCH" | "DELETE"> = {
  [UpdateType.PUT]: "PUT", [UpdateType.PATCH]: "PATCH", [UpdateType.DELETE]: "DELETE",
};

/** Colunas json/listas estão como texto no SQLite; o banco espera o objeto. */
function toServer(table: string, data: Record<string, unknown> | undefined) {
  if (!data) return {};
  const out = { ...data };
  for (const col of JSON_COLUMNS[table] ?? []) {
    const v = out[col];
    if (typeof v === "string") {
      try { out[col] = JSON.parse(v); } catch { /* texto que não é json: vai como está */ }
    }
  }
  return out;
}

const toOp = (e: CrudEntry) => ({ op: OP[e.op], table: e.table, id: e.id, data: toServer(e.table, e.opData) });

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return { endpoint: POWERSYNC_URL, token: data.session.access_token };
  }

  /**
   * Envia cada transação local (o que foi feito junto no app) como um lote único para apply_changes,
   * que aplica tudo ou nada no servidor com as regras do banco.
   */
  async uploadData(db: AbstractPowerSyncDatabase) {
    const tx = await db.getNextCrudTransaction();
    if (!tx) return;

    const ops = tx.crud.map(toOp);
    const { error } = await supabase.rpc("apply_changes", { ops });
    if (error && !FATAL.test(error.code ?? "")) throw error; // rede/servidor: o PowerSync tenta de novo

    if (error) {
      // Recusado pelas regras: guarda para a equipe ver. Ao concluir, o aparelho volta ao que está no servidor.
      await db.writeTransaction(async (w) => {
        for (const op of ops) {
          await w.execute(
            `insert into sync_conflicts (id, created_at, table_name, row_id, operation, data, error_code, message)
             values (uuid(), ?, ?, ?, ?, ?, ?, ?)`,
            [new Date().toISOString(), op.table, op.id, op.op, JSON.stringify(op.data), error.code, error.message],
          );
        }
      });
    }
    await tx.complete();
  }
}
