import Link from "next/link";
import { Ban, ExternalLink, Gift, Plus, Search } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { brl, fmtDate, fmtTime, METHOD_LABEL, todaySP } from "@/lib/format";
import { STATE_LABEL, VOUCHER_MAX, VOUCHER_MIN, voucherPath, voucherState, type VoucherRow, type VoucherState } from "@/lib/vouchers";
import ConfirmButton from "@/components/painel/ConfirmButton";
import VoucherForm from "@/components/painel/VoucherForm";
import { Alert, Badge, Card, EmptyState, PageHeader, Tabs, type Tone } from "@/components/painel/ui";
import { cancelVoucher } from "../../voucher-actions";
import type { PaymentMethod } from "@/lib/types";

export const metadata = { title: "Vouchers" };

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const STATE_TONE: Record<VoucherState, Tone> = {
  pendente: "gold", ativo: "green", agendado: "blue", usado: "gray", expirado: "red", cancelado: "gray",
};

const STATE_ORDER: VoucherState[] = ["ativo", "agendado", "usado", "pendente", "expirado", "cancelado"];

/** "pix", "credit_card" (InfinitePay) ou uma forma cadastrada no painel — sempre em português. */
function paymentLabel(v: Pick<VoucherRow, "payment">) {
  const cm = v.payment?.capture_method;
  if (!cm) return "—";
  if (cm === "cortesia") return "Cortesia";
  if (cm === "pix") return "Pix";
  if (cm === "credit_card") return "Cartão de crédito";
  if (cm === "debit_card") return "Cartão de débito";
  if (cm in METHOD_LABEL) return METHOD_LABEL[cm as PaymentMethod];
  return cm;
}

export default async function VouchersPage({ searchParams }: PageProps<"/painel/vouchers">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const estado = typeof sp.estado === "string" && (STATE_ORDER as string[]).includes(sp.estado) ? (sp.estado as VoucherState) : null;
  const criadoId = typeof sp.criado === "string" ? sp.criado : undefined;

  const [vouchersRes, openApptsRes, servicesRes] = await Promise.all([
    supabase.from("vouchers").select("*").order("created_at", { ascending: false }),
    supabase.from("appointments").select("id, voucher_id, starts_at, clients(name)")
      .not("voucher_id", "is", null).in("status", ["solicitado", "confirmado"]),
    supabase.from("services").select("id, name, price").eq("active", true).gt("price", 0).order("sort_order").order("name"),
  ]);

  const vouchers = (vouchersRes.data ?? []) as VoucherRow[];
  const openAppts = new Map<string, { id: string; starts_at: string; client: string | null }>();
  for (const a of (openApptsRes.data ?? []) as unknown as { id: string; voucher_id: string | null; starts_at: string; clients: { name: string } | null }[]) {
    if (a.voucher_id) openAppts.set(a.voucher_id, { id: a.id, starts_at: a.starts_at, client: a.clients?.name ?? null });
  }
  const services = (servicesRes.data ?? []).map((s) => ({ ...s, price: Number(s.price) }));

  const withState = vouchers.map((v) => ({
    v, appt: openAppts.get(v.id) ?? null, state: voucherState(v, openAppts.has(v.id), today),
  }));

  const counts = withState.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.state]: (acc[x.state] ?? 0) + 1 }), {});
  const monthPrefix = today.slice(0, 7);
  const soldThisMonth = vouchers.filter((v) => v.status !== "pendente" && v.status !== "cancelado" && v.paid_at?.slice(0, 7) === monthPrefix);
  const soldThisMonthTotal = soldThisMonth.reduce((s, v) => s + Number(v.amount), 0);

  const nq = normalize(q);
  const list = withState.filter(({ v, state }) => {
    if (estado && state !== estado) return false;
    if (!q) return true;
    return normalize(v.code).includes(nq) || normalize(v.buyer_name).includes(nq) || normalize(v.recipient_name ?? "").includes(nq);
  });

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const cur = { q: q || null, estado, ...patch };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return `/painel/vouchers${s ? `?${s}` : ""}`;
  };

  const criadoVoucher = criadoId ? vouchers.find((v) => v.id === criadoId) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Vendas"
        title="Vouchers"
        subtitle={`${counts.ativo ?? 0} disponíveis · ${counts.agendado ?? 0} agendados · ${soldThisMonth.length} vendidos no mês (${brl(soldThisMonthTotal)})`}
      />

      <div className="flex flex-col gap-4">
        {criadoVoucher && (
          <Alert tone="green">
            Voucher criado: <strong className="font-mono">{criadoVoucher.code}</strong>.{" "}
            <a href={voucherPath(criadoVoucher)} target="_blank" rel="noopener noreferrer" className="underline">Ver página do voucher</a>
          </Alert>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <form className="relative flex-1 max-w-md" action="/painel/vouchers">
            {estado && <input type="hidden" name="estado" value={estado} />}
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A69885]" aria-hidden="true" />
            <input name="q" defaultValue={q} placeholder="Código, comprador ou presenteado" className="p-input pl-9" aria-label="Buscar vouchers" />
          </form>
        </div>

        <Tabs
          current={estado ?? "todos"}
          tabs={[
            { key: "todos", label: `Todos · ${withState.length}`, href: href({ estado: null }) },
            ...STATE_ORDER.map((s) => ({ key: s, label: `${STATE_LABEL[s]} · ${counts[s] ?? 0}`, href: href({ estado: s }) })),
          ]}
        />

        <Card bodyClassName="p-3">
          {list.length === 0 ? (
            <EmptyState icon={Gift}>Nenhum voucher nesta lista.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map(({ v, appt, state }) => {
                const what = v.kind === "servico" ? (v.service_name ?? "Serviço") : "Vale-presente";
                const canCancel = (v.status === "ativo" || v.status === "pendente") && !appt;
                return (
                  <li key={v.id} className="rounded-xl border border-[#F0E8DB] px-4 py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-base text-[#2B221B]">{v.code}</span>
                        <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={voucherPath(v)} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm">
                          <ExternalLink size={13} /> Ver voucher
                        </a>
                        {canCancel && (
                          <form action={cancelVoucher}>
                            <input type="hidden" name="id" value={v.id} />
                            <ConfirmButton confirmText="Cancelar voucher"><Ban size={13} /> Cancelar</ConfirmButton>
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-sm">
                      <div>
                        <p className="p-label mb-0.5">O quê</p>
                        <p className="text-[#2B221B]">{what}</p>
                      </div>
                      <div>
                        <p className="p-label mb-0.5">Valor</p>
                        <p className="p-num text-[#2B221B]">
                          {brl(v.amount)}
                          {v.kind === "valor" && Number(v.balance) < Number(v.amount) && ` · saldo ${brl(v.balance)}`}
                        </p>
                      </div>
                      <div>
                        <p className="p-label mb-0.5">De → Para</p>
                        <p className="text-[#2B221B]">{v.buyer_name}{!v.for_self && v.recipient_name ? ` → ${v.recipient_name}` : ""}</p>
                      </div>
                      <div>
                        <p className="p-label mb-0.5">Criado / Pago</p>
                        <p className="text-[#2B221B]">{fmtDate(v.created_at)}{v.paid_at ? ` · pago ${fmtDate(v.paid_at)}` : ""}</p>
                      </div>
                      <div>
                        <p className="p-label mb-0.5">Validade</p>
                        <p className="text-[#2B221B]">{v.expires_on ? fmtDate(v.expires_on) : "—"}</p>
                      </div>
                      <div>
                        <p className="p-label mb-0.5">Origem</p>
                        <p className="text-[#2B221B]">{v.source === "site" ? "Site" : "Painel"} · {paymentLabel(v)}</p>
                      </div>
                      {appt && (
                        <div>
                          <p className="p-label mb-0.5">Agendado</p>
                          <Link href={`/painel/agenda?a=${appt.id}`} className="underline text-[#82590F]">
                            {fmtDate(appt.starts_at)} {fmtTime(appt.starts_at)}{appt.client ? ` · ${appt.client}` : ""}
                          </Link>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <details className="p-card">
          <summary className="flex items-center gap-2 px-5 py-3.5 text-bronze-900">
            <Plus size={16} /> <span className="text-lg" style={{ fontFamily: "var(--font-cormorant), serif" }}>Novo voucher</span>
          </summary>
          <div className="px-5 pb-5">
            <VoucherForm services={services} voucherMin={VOUCHER_MIN} voucherMax={VOUCHER_MAX} />
          </div>
        </details>
      </div>
    </>
  );
}
