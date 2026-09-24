"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { uploadSiteImage } from "@/app/painel/site-actions";

/** Reduz para no máx. 2000px (JPEG, ou WEBP se tiver transparência) antes do envio. */
async function compress(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // PNG (ex.: logo) mantém a transparência em WEBP.
  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.86));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, type === "image/jpeg" ? ".jpg" : ".webp"), { type }) : file;
}

/**
 * Campo de foto do editor do site: envia na hora para o Storage e guarda a URL
 * num input escondido, que vai junto quando o formulário é salvo.
 */
export default function ImageField({
  name, label, defaultValue, fallback, folder, hint, aspect = "aspect-[4/3]",
}: {
  name: string;
  label: string;
  defaultValue: string;
  /** Foto padrão: se existir, o botão vira "Restaurar padrão"; senão, "Remover". */
  fallback?: string;
  folder: string;
  hint?: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shown = url || fallback || "";

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", await compress(file));
      fd.append("folder", folder);
      const r = await uploadSiteImage(fd);
      if (r.ok) setUrl(r.url);
      else setError(r.message);
    });
  };

  return (
    <div>
      <span className="p-label">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
        <div className={`relative w-full sm:w-48 ${aspect} rounded-xl overflow-hidden border border-[#EEDFBF] bg-[#FBF7EE] flex-shrink-0`}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="absolute inset-0 w-full h-full object-contain" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-[#A69885]">Sem foto</span>
          )}
          {pending && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 size={20} className="animate-spin text-[#9A6F1E]" />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" className="p-btn-ghost p-btn-sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            <ImagePlus size={14} /> {shown ? "Trocar foto" : "Escolher foto"}
          </button>
          {url && (
            <button type="button" className="p-btn-ghost p-btn-sm" onClick={() => setUrl("")} disabled={pending}>
              {fallback ? <><RotateCcw size={14} /> Restaurar padrão</> : <><Trash2 size={14} /> Remover</>}
            </button>
          )}
          {hint && <p className="text-[11px] text-[#A69885] max-w-56">{hint}</p>}
          {url !== defaultValue && !pending && <p className="text-[11px] text-[#9A5B00]">Clique em Salvar para publicar.</p>}
          {error && <p role="alert" className="text-xs text-[#9B2C2C]">{error}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} tabIndex={-1} />
    </div>
  );
}
