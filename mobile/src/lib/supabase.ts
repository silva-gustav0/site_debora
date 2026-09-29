import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

/**
 * Guarda a sessão no Keystore do Android (expo-secure-store). A sessão passa do limite de ~2 KB
 * por item, então é dividida em partes: `<chave>.n` diz quantas, `<chave>.0`, `<chave>.1`… o conteúdo.
 */
const CHUNK = 1800;
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");

const secureStorage = {
  async getItem(key: string) {
    const k = safeKey(key);
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    if (!n) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${k}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    const k = safeKey(key);
    await secureStorage.removeItem(key);
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK}}`, "g")) ?? [""];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${k}.${i}`, p)));
    await SecureStore.setItemAsync(`${k}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const k = safeKey(key);
    const n = Number(await SecureStore.getItemAsync(`${k}.n`));
    await Promise.all(Array.from({ length: n || 0 }, (_, i) => SecureStore.deleteItemAsync(`${k}.${i}`)));
    await SecureStore.deleteItemAsync(`${k}.n`);
  },
};

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL ?? "";

export const supabase = createClient(SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "", {
  auth: { storage: secureStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
