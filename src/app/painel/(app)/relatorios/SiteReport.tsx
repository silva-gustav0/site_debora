import type { SupabaseClient } from "@supabase/supabase-js";
import { Eye, MessageCircle, MousePointerClick, Sparkles } from "lucide-react";
import { BarList } from "@/components/painel/charts";
import { Card, StatTile } from "@/components/painel/ui";
import { addDays } from "@/lib/format";
import { dayStart } from "@/lib/queries";

type Ev = { session: string; kind: string; target: string | null };

/** Conta sessões distintas por alvo (uma visitante que viu duas vezes conta uma). */
function bySessions(events: Ev[], kind: string, name: (t: string) => string | undefined) {
  const m = new Map<string, Set<string>>();
  for (const e of events) if (e.kind === kind && e.target) {
    const label = name(e.target);
    if (label) m.set(label, (m.get(label) ?? new Set()).add(e.session));
  }
  return [...m.entries()].map(([label, s]) => ({ label, value: s.size })).sort((a, b) => b.value - a.value).slice(0, 8);
}

const ORIGIN: Record<string, string> = { direto: "Direto (link ou digitado)", "instagram.com": "Instagram", "l.instagram.com": "Instagram", "google.com": "Google", "facebook.com": "Facebook", "l.facebook.com": "Facebook", "wa.me": "WhatsApp" };

/** O que as visitantes olham no site: funil, serviços e promoções que chamaram atenção e de onde vieram. */
export default async function SiteReport({ supabase, from, to, services, siteBookings }: {
  supabase: SupabaseClient; from: string; to: string; services: { id: string; name: string }[]; siteBookings: number;
}) {
  const [{ data }, promosRes] = await Promise.all([
    supabase.from("site_events").select("session, kind, target")
      .gte("created_at", dayStart(from)).lt("created_at", dayStart(addDays(to, 1))).limit(50_000),
    supabase.from("promotions").select("id, title"),
  ]);
  const events = (data ?? []) as Ev[];
  const sessions = (pred: (e: Ev) => boolean) => new Set(events.filter(pred).map((e) => e.session)).size;
  const visits = sessions((e) => e.kind === "visita");
  const sawService = sessions((e) => e.kind === "servico");
  const reachedBooking = sessions((e) => e.kind === "secao" && e.target === "agendamento");
  const whats = sessions((e) => e.kind === "whatsapp");
  const pct = (n: number) => (visits ? `${Math.round((n / visits) * 100)}% das visitas` : "—");

  const svc = new Map(services.map((s) => [s.id, s.name]));
  const promo = new Map((promosRes.data ?? []).map((p) => [p.id as string, p.title as string]));
  const topServices = bySessions(events, "servico", (t) => svc.get(t));
  const topPromos = bySessions(events, "promocao", (t) => promo.get(t));
  const origins = bySessions(events, "visita", (t) => ORIGIN[t] ?? t);
  // Clique no WhatsApp vindo de uma promoção: "banner:promocao:<id>", "aviso:…", "destaque:…", "balao:promocao:<id>".
  const promoClicks = bySessions(events, "whatsapp", (t) => { const [, k, id] = t.split(":"); return k === "promocao" ? promo.get(id) : undefined; });

  return (
    <section className="mt-8">
      <h2 className="text-[11px] tracking-[0.25em] uppercase font-bold text-[#9A6F1E] mb-3">Site · o que as visitantes olham</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatTile label="Visitas" value={visits} hint="pessoas diferentes (sem identificar ninguém)" icon={Eye} />
        <StatTile label="Olharam serviços" value={sawService} hint={pct(sawService)} icon={Sparkles} />
        <StatTile label="Chegaram ao agendamento" value={reachedBooking} hint={`${pct(reachedBooking)} · ${siteBookings} pedidos`} icon={MousePointerClick} />
        <StatTile tone="dark" label="Chamaram no WhatsApp" value={whats} hint={pct(whats)} icon={MessageCircle} />
      </div>
      <div className="grid xl:grid-cols-4 gap-5">
        <Card title="Serviços mais vistos" eyebrow="Visitantes que pararam no cartão">
          <BarList rows={topServices} format={(n) => String(n)} empty="Ainda sem dados." />
        </Card>
        <Card title="Promoções mais vistas">
          <BarList rows={topPromos} format={(n) => String(n)} empty="Nenhuma promoção vista." color="#C9973A" />
        </Card>
        <Card title="Promoções que viraram conversa" eyebrow="Cliques para o WhatsApp">
          <BarList rows={promoClicks} format={(n) => String(n)} empty="Nenhum clique ainda." color="#25D366" />
        </Card>
        <Card title="De onde vêm as visitas">
          <BarList rows={origins} format={(n) => String(n)} empty="Ainda sem dados." color="#6B8F71" />
        </Card>
      </div>
    </section>
  );
}
