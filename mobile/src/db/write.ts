import type { Transaction } from "@powersync/react-native";
import * as Crypto from "expo-crypto";
import { openDatabase } from "./database";

/**
 * Gravação no banco local. Tudo o que uma ação faz vai numa única transação (`write`), que o
 * conector envia ao servidor como um lote só (apply_changes: tudo ou nada, com as regras do banco).
 *
 * Valores que só o servidor calcula (estoque, saldo do voucher, valor coberto pelo voucher) podem ser
 * gravados aqui como estimativa para a tela: o servidor ignora essas colunas e a sincronização traz o valor certo.
 */
export const newId = () => Crypto.randomUUID();

type Value = string | number | boolean | null | undefined | object;
export type Row = Record<string, Value>;

/** SQLite guarda booleano como 0/1 e json/listas como texto. */
const toSql = (v: Value) =>
  v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v !== null && typeof v === "object" ? JSON.stringify(v) : v;

export class Writer {
  constructor(private tx: Transaction) {}

  /** Cria a linha e devolve o id (gerado se não vier). */
  async insert(table: string, row: Row) {
    const id = typeof row.id === "string" && row.id ? row.id : newId();
    const entries = Object.entries({ ...row, id }).filter(([, v]) => v !== undefined);
    const cols = entries.map(([k]) => k);
    await this.tx.execute(
      `insert into ${table} (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")})`,
      entries.map(([, v]) => toSql(v)),
    );
    return id;
  }

  /** Altera só as colunas informadas (é o que vai para o servidor). */
  async update(table: string, id: string, patch: Row) {
    const entries = Object.entries(patch).filter(([k, v]) => k !== "id" && v !== undefined);
    if (!entries.length) return;
    await this.tx.execute(
      `update ${table} set ${entries.map(([k]) => `${k} = ?`).join(", ")} where id = ?`,
      [...entries.map(([, v]) => toSql(v)), id],
    );
  }

  async remove(table: string, id: string) {
    await this.tx.execute(`delete from ${table} where id = ?`, [id]);
  }

  /** Leitura dentro da mesma transação (ex.: conferir algo antes de gravar). */
  async get<T>(sql: string, params: unknown[] = []) {
    return (await this.tx.getOptional<T>(sql, params)) ?? null;
  }

  async all<T>(sql: string, params: unknown[] = []) {
    return this.tx.getAll<T>(sql, params);
  }
}

/** Executa uma ação da tela como uma transação única. */
export async function write<T>(fn: (w: Writer) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  return db.writeTransaction((tx) => fn(new Writer(tx)));
}

/** Deixa o erro de uma gravação visível: mostra aviso em vez de falhar em silêncio (devolve false se falhou). */
export const save = (toast: (text: string, tone?: "ok" | "error") => void, run: Promise<unknown>) =>
  run.then(() => true, () => { toast("Não foi possível salvar. Tente de novo.", "error"); return false; });

/** Leitura avulsa fora dos hooks (ex.: dentro de um handler). */
export async function queryAll<T>(sql: string, params: unknown[] = []) {
  return (await openDatabase()).getAll<T>(sql, params);
}

export async function queryOne<T>(sql: string, params: unknown[] = []) {
  return (await (await openDatabase()).getOptional<T>(sql, params)) ?? null;
}
