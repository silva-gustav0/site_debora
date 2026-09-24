"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadPhoto } from "@/app/painel/actions";
import { todaySP } from "@/lib/format";

/** Reduz a foto para no máx. 1600px em JPEG antes do envio (fotos de celular têm 5–10 MB). */
async function compress(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.84));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
}

export default function PhotoUploader({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState(uploadPhoto, null);
  const [preparing, setPreparing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    setPreparing(true);
    fd.delete("photos");
    for (const f of files) fd.append("photos", await compress(f));
    setPreparing(false);
    startTransition(() => action(fd));
    formRef.current?.reset();
  };

  const busy = pending || preparing;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="rounded-2xl border border-dashed border-[#E6D8BC] bg-[#FEFBF7] p-4 flex flex-col gap-3">
      <input type="hidden" name="client_id" value={clientId} />
      <label className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white border border-[#F0E8DB] py-6 cursor-pointer hover:border-[#9A6F1E] transition-colors">
        <Camera size={22} className="text-[#C9973A]" />
        <span className="text-sm text-[#6B5A4B]">Toque para escolher ou tirar fotos</span>
        <span className="text-[11px] text-[#A69885]">Até 6 por vez · comprimidas automaticamente</span>
        <input type="file" name="photos" accept="image/*" capture="environment" multiple required className="sr-only" />
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <select name="kind" defaultValue="antes" className="p-input" aria-label="Tipo">
          <option value="antes">Antes</option>
          <option value="depois">Depois</option>
          <option value="evolucao">Evolução</option>
        </select>
        <input type="date" name="taken_on" defaultValue={todaySP()} className="p-input" aria-label="Data" />
        <input name="caption" placeholder="Legenda (opcional)" className="p-input col-span-2 sm:col-span-1" />
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="p-btn">
          {busy && <Loader2 size={13} className="animate-spin" />} {preparing ? "Preparando…" : pending ? "Enviando…" : "Enviar fotos"}
        </button>
        {state && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-[#1F6B3A]" : "text-[#9B2C2C]"}`}>{state.message}</p>
        )}
      </div>
    </form>
  );
}
