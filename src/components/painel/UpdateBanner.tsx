"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { APK_URL } from "@/lib/version";

type Remote = { web: string; apk: number; shell: number };
const CHECK_MS = 2 * 60_000;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };

/** Avisa quando há versão nova do painel (ou do app) e atualiza por dentro, com animação, sem abrir o navegador. */
export default function UpdateBanner({ version }: { version: string }) {
  const [remote, setRemote] = useState<Remote | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(location.search).get("app");
    if (fromUrl) write("app-shell", fromUrl);
    const s = Number(read("app-shell") ?? 0);
    if (s) document.documentElement.dataset.app = String(s);
    const check = () => fetch("/api/versao", { cache: "no-store" }).then((r) => r.json()).then((r) => setRemote({ ...r, shell: s })).catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible") { setDismissed(false); check(); } };
    check();
    const t = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const apkUpdate = Boolean(remote?.shell && remote.apk > remote.shell);
  const webUpdate = Boolean(remote && version !== "dev" && remote.web !== version);
  const show = (apkUpdate || webUpdate) && !dismissed;

  const update = () => {
    setUpdating(true);
    if (apkUpdate) { location.href = APK_URL; setTimeout(() => setUpdating(false), 4000); return; }
    setTimeout(() => location.reload(), 1400);
  };

  return (
    <>
      {show && !updating && (
        <div role="status" className="no-print fixed z-[70] left-3 right-3 bottom-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px] rounded-2xl p-4 text-white shadow-2xl p-rise"
          style={{ background: "linear-gradient(135deg,#2B221B,#48392B)", border: "1px solid rgba(232,200,130,.35)" }}>
          <button onClick={() => setDismissed(true)} aria-label="Lembrar depois" className="absolute top-2 right-2 p-2 text-white/60"><X size={16} /></button>
          <p className="text-[10px] tracking-[0.24em] uppercase text-[#E8C882]">Atualização disponível</p>
          <p className="text-sm mt-1 pr-6 text-white/85">
            {apkUpdate ? "Há uma nova versão do aplicativo. A instalação leva poucos segundos." : "Há uma nova versão do painel com melhorias. Seus dados continuam salvos."}
          </p>
          <button onClick={update} className="p-btn p-btn-gold mt-3 w-full">
            {apkUpdate ? <Download size={15} /> : <RefreshCw size={15} />} {apkUpdate ? "Instalar atualização" : "Atualizar agora"}
          </button>
        </div>
      )}
      {updating && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 text-white" style={{ background: "radial-gradient(circle at 50% 40%,#48392B,#1E1712)" }} role="alert" aria-live="assertive">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/app/icon-192.png" alt="" width={96} height={96} className="w-24 h-24 rounded-3xl update-pulse" />
          <div className="w-52 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full update-bar" style={{ background: "linear-gradient(90deg,#C9973A,#F3DDA6)" }} /></div>
          <p className="p-display text-2xl">Atualizando…</p>
          <p className="text-xs text-white/50">{apkUpdate ? "Toque em Instalar quando o Android pedir." : "O painel vai reabrir em instantes."}</p>
        </div>
      )}
    </>
  );
}
