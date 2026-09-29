import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { newId, queryAll, write } from "@/db/write";
import { supabase } from "./supabase";

const BUCKET = "client-photos";
const MAX = 1600;
export type PhotoMeta = { kind: string; taken_on: string; caption: string };
type Upload = PhotoMeta & { id: string; client_id: string; local_uri: string };

/** Pasta do app onde as fotos esperam o envio. */
function queueDir() {
  const d = new Directory(Paths.document, "fotos-pendentes");
  d.create({ idempotent: true, intermediates: true });
  return d;
}

/** Reduz a foto para no máx. 1600px em JPEG 0,8 e a guarda na pasta do app. */
async function compress(a: ImagePicker.ImagePickerAsset) {
  const ctx = ImageManipulator.manipulate(a.uri);
  const big = Math.max(a.width, a.height) > MAX;
  const img = await (big ? ctx.resize(a.width >= a.height ? { width: MAX } : { height: MAX }) : ctx).renderAsync();
  const file = new File((await img.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })).uri);
  await file.move(queueDir());
  return file.uri;
}

/** Tira ou escolhe fotos, comprime e coloca na fila de envio; devolve quantas entraram. */
export async function pickPhotos(camera: boolean, clientId: string, meta: PhotoMeta) {
  const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(camera ? "Permita o uso da câmera para tirar fotos." : "Permita o acesso às fotos do aparelho.");
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: !camera, selectionLimit: 6 };
  const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled) return 0;
  const uris = await Promise.all(r.assets.slice(0, 6).map(compress));
  await write(async (w) => {
    for (const local_uri of uris) {
      await w.insert("photo_uploads", { client_id: clientId, local_uri, ...meta, caption: meta.caption.trim() || null, created_at: new Date().toISOString() });
    }
  });
  return uris.length;
}

let running: Promise<number> | null = null;

/** Envia a fila ao Storage e registra cada foto em client_photos; devolve quantas foram enviadas. */
export function syncPhotos() {
  running ??= (async () => {
    let sent = 0;
    try {
      for (const p of await queryAll<Upload>("select * from photo_uploads order by created_at")) {
        const file = new File(p.local_uri);
        if (!file.exists) { await write((w) => w.remove("photo_uploads", p.id)); continue; }
        const path = `${p.client_id}/${newId()}.jpg`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: "image/jpeg" });
        if (error) { await write((w) => w.update("photo_uploads", p.id, { error: error.message })); break; }
        await write(async (w) => {
          await w.insert("client_photos", { client_id: p.client_id, path, kind: p.kind, taken_on: p.taken_on, caption: p.caption, created_at: new Date().toISOString() });
          await w.remove("photo_uploads", p.id);
        });
        file.delete();
        sent++;
      }
    } finally {
      running = null;
    }
    return sent;
  })();
  return running;
}

/** Descarta uma foto da fila (ainda não enviada). */
export async function discardQueued(id: string, uri: string) {
  const file = new File(uri);
  if (file.exists) file.delete();
  await write((w) => w.remove("photo_uploads", id));
}

/** Exclui a foto do Storage e do cadastro (só com internet). */
export async function deletePhoto(id: string, path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  await write((w) => w.remove("client_photos", id));
}

/** Remove do Storage e da fila todas as fotos da cliente (ao excluir o cadastro). */
export async function removeClientPhotos(clientId: string) {
  const [sent, queued] = await Promise.all([
    queryAll<{ path: string }>("select path from client_photos where client_id = ?", [clientId]),
    queryAll<Upload>("select * from photo_uploads where client_id = ?", [clientId]),
  ]);
  for (const q of queued) await discardQueued(q.id, q.local_uri);
  if (sent.length) await supabase.storage.from(BUCKET).remove(sent.map((p) => p.path));
}

/** URLs assinadas (1 h) das fotos enviadas; vazio quando não há caminhos (ex.: sem internet). */
export function useSignedUrls(paths: string[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join("|");
  useEffect(() => {
    if (!key) return;
    supabase.storage.from(BUCKET).createSignedUrls(key.split("|"), 3600).then(({ data }) =>
      setUrls(Object.fromEntries((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path, d.signedUrl]))));
  }, [key]);
  return urls;
}
