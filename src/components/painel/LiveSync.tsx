"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarPlus, X } from "lucide-react";
import { syncPanel } from "@/app/painel/actions";
import { createClient } from "@/lib/supabase/client";

/** Mantém o painel igual ao banco em tempo real (Supabase Realtime) e guarda os arquivos do app no aparelho. */
export default function LiveSync() {
  const [booking, setBooking] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const db = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined, poll: ReturnType<typeof setInterval> | undefined, hiddenAt = 0, subscribedOnce = false;
    // A própria action revalida o painel e já devolve a tela atualizada (uma ida ao servidor só).
    const sync = () => { clearTimeout(timer); timer = setTimeout(() => startTransition(() => { syncPanel(); }), 100); };
    let channel: ReturnType<typeof db.channel> | undefined;
    db.auth.getSession().then(async ({ data }) => {
      if (data.session) await db.realtime.setAuth(data.session.access_token);
      channel = db.channel("painel-ao-vivo")
        .on("postgres_changes", { event: "*", schema: "public" }, (e) => {
          const row = e.new as { id?: string; source?: string };
          if (e.table === "appointments" && e.eventType === "INSERT" && row.source === "site" && row.id) setBooking({ id: row.id });
          sync();
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") { clearInterval(poll); poll = undefined; if (subscribedOnce) sync(); subscribedOnce = true; }
          if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !poll) poll = setInterval(sync, 30_000);
        });
    });
    const onVisible = () => { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 15_000) sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); clearInterval(poll); document.removeEventListener("visibilitychange", onVisible); if (channel) db.removeChannel(channel); };
  }, []);

  if (!booking) return null;
  return (
    <div role="status" className="no-print fixed z-[70] top-3 left-3 right-3 sm:left-auto sm:right-5 sm:w-[360px] rounded-2xl p-4 pr-10 text-white shadow-2xl toast-in"
      style={{ background: "linear-gradient(135deg,#2B221B,#48392B)", border: "1px solid rgba(232,200,130,.35)" }}>
      <button onClick={() => setBooking(null)} aria-label="Fechar aviso" className="absolute top-2 right-2 p-2 text-white/60"><X size={16} /></button>
      <p className="flex items-center gap-2 text-[10px] tracking-[0.24em] uppercase text-[#E8C882]"><CalendarPlus size={13} /> Novo agendamento pelo site</p>
      <Link href={`/painel/agenda?a=${booking.id}`} onClick={() => setBooking(null)} className="p-btn p-btn-gold mt-3 w-full">Ver agendamento</Link>
    </div>
  );
}
