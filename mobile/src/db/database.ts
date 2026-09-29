import { FetchStrategy, PowerSyncDatabase } from "@powersync/react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { SupabaseConnector } from "./connector";
import { AppSchema } from "./schema";

const KEY_NAME = "db-encryption-key";

/** Chave do banco local: gerada uma vez, guardada só no Keystore do Android (nunca sai do aparelho). */
async function encryptionKey() {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  await SecureStore.setItemAsync(KEY_NAME, key);
  return key;
}

let db: PowerSyncDatabase | null = null;

/** Abre (uma vez) o banco local criptografado com SQLCipher (ativado em package.json → "op-sqlite"). */
export async function openDatabase() {
  if (db) return db;
  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: "clinica.db", sqliteOptions: { encryptionKey: await encryptionKey() } },
  });
  await db.init();
  return db;
}

export const connector = new SupabaseConnector();

/** Conecta para sincronizar em tempo real (envia em até 100 ms e processa cada mudança assim que chega). */
export async function startSync() {
  const d = await openDatabase();
  if (!d.connected && !d.currentStatus.connecting) {
    await d.connect(connector, { crudUploadThrottleMs: 100, retryDelayMs: 2000, fetchStrategy: FetchStrategy.Sequential });
  }
  return d;
}

/**
 * Apaga tudo do aparelho: dados locais e fila de envio. O VACUUM reescreve o arquivo para não
 * sobrar nada nas páginas liberadas. Usado ao sair e quando o acesso da pessoa é removido no painel.
 */
export async function wipeDevice() {
  const d = await openDatabase();
  await d.disconnectAndClear();
  await d.execute("VACUUM");
}
