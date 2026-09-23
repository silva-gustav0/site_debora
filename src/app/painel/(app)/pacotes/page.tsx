import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { listServices } from "@/lib/queries";
import { brl, diffDays, fmtDate, METHOD_LABEL, todaySP } from "@/lib/format";
import ActionForm from "@/components/painel/ActionForm";
import Drawer from "@/components/painel/Drawer";
import SubmitButton from "@/components/painel/SubmitButton";
import { Avatar, Badge, Card, Chips, EmptyState, PageHeader, Progress, StatTile } from "@/components/painel/ui";
import { savePackage, sellPackage } from "../../actions";
import type { ClientPackage, PackageRow, ServiceRow } from "@/lib/types";

export const metadata = { title: "Pacotes" };

function PackageForm({ pkg, services }: { pkg?: PackageRow; services: ServiceRow[] }) {
  return (
    <ActionForm action={savePackage} resetOnSuccess={!pkg} className="flex flex-col gap-3">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      <label><span className="p-label">Nome</span><input name="name" required defaultValue={pkg?.name} placeholder="Ex.: 10 sessões de drenagem" className="p-input" /></label>
      <label>
        <span className="p-label">Serviço</span>
        <select name="service_id" defaultValue={pkg?.service_id} className="p-input">
          {services.map((s) => <option key={s.id} value={s.id}>{s.name} · avulso {brl(s.price)}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label><span className="p-label">Sessões</span><input name="sessions" type="number" min={1} max={100} required defaultValue={pkg?.sessions ?? 10} className="p-input p-num" /></label>
        <label><span className="p-label">Preço (R$)</span><input name="price" required inputMode="decimal" defaultValue={pkg ? String(pkg.price).replace(".", ",") : ""} className="p-input p-num" /></label>
        <label><span className="p-label">Validade (dias)</span><input name="validity_days" type="number" min={1} defaultValue={pkg?.validity_days ?? 180} className="p-input p-num" /></label>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#6B4C52]">
        <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="accent-[#A85B63]" /> Disponível para venda
      </label>
      <div><SubmitButton>{pkg ? "Salvar" : "Criar pacote"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function PackagesPage({ searchParams }: PageProps<"/painel/pacotes">) {
  const sp = await searchParams;
  const { supabase } = await requireStaff();
  const today = todaySP();
  const filter = ["ativos", "vencendo", "encerrados"].includes(String(sp.f)) ? String(sp.f) : "ativos";

  const [catalogRes, soldRes, services, clientsRes] = await Promise.all([
    supabase.from("packages").select("*").order("active", { ascending: false }).order("name"),
    supabase.from("client_package_usage").select("*, clients(id, name)").order("purchased_on", { ascending: false }),
    listServices(supabase),
    supabase.from("clients").select("id, name").order("name"),
  ]);
  const catalog = (catalogRes.data ?? []) as PackageRow[];
  const sold = (soldRes.data ?? []) as (ClientPackage & { clients: { id: string; name: string } | null })[];
  const serviceById = new Map(services.map((s) => [s.id, s]));

  const active = sold.filter((p) => p.status === "ativo");
  const expiring = active.filter((p) => (p.expires_on && diffDays(today, p.expires_on) <= 30) || Number(p.sessions_remaining) <= 1);
  const list = filter === "ativos" ? active : filter === "vencendo" ? expiring : sold.filter((p) => p.status !== "ativo");
  const soldMonth = sold.filter((p) => p.purchased_on.startsWith(today.slice(0, 7)));
  const pendingSessions = active.reduce((s, p) => s + Number(p.sessions_remaining), 0);
  const deferred = active.reduce((s, p) => s + (Number(p.price) / p.sessions_total) * Number(p.sessions_remaining), 0);
  const editing = typeof sp.editar === "string" ? catalog.find((p) => p.id === sp.editar) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Gestão"
        title="Pacotes de sessões"
        subtitle="Venda pacotes, acompanhe o saldo de sessões e a validade."
        actions={
          <>
            <Link href="/painel/pacotes?novo=1" scroll={false} className="p-btn-ghost"><Plus size={14} /> Novo pacote</Link>
            <Link href="/painel/pacotes?vender=1" scroll={false} className="p-btn p-btn-gold"><Package size={14} /> Vender pacote</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Pacotes ativos" value={active.length} icon={Package} />
        <StatTile label="Sessões a realizar" value={pendingSessions} hint="saldo das clientes" />
        <StatTile label="Receita a executar" value={brl(deferred)} hint="já recebida, sessões pendentes" />
        <StatTile label="Vendidos no mês" value={soldMonth.length} hint={brl(soldMonth.reduce((s, p) => s + Number(p.price), 0))} />
      </div>

      <div className="grid xl:grid-cols-[1fr_360px] gap-5">
        <Card bodyClassName="p-0">
          <div className="px-5 py-3 border-b border-[#F6ECE9]">
            <Chips
              current={filter}
              items={[
                { key: "ativos", label: `Ativos · ${active.length}`, href: "/painel/pacotes" },
                { key: "vencendo", label: `Acabando ou vencendo · ${expiring.length}`, href: "/painel/pacotes?f=vencendo" },
                { key: "encerrados", label: "Encerrados", href: "/painel/pacotes?f=encerrados" },
              ]}
            />
          </div>
          {list.length === 0 ? <EmptyState icon={Package}>Nenhum pacote nesta lista.</EmptyState> : (
            <ul className="divide-y divide-[#F6ECE9]">
              {list.map((p) => {
                const daysLeft = p.expires_on ? diffDays(today, p.expires_on) : null;
                return (
                  <li key={p.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <Link href={`/painel/clientes/${p.client_id}?tab=pacotes`} className="flex items-center gap-3 sm:w-60 min-w-0">
                      <Avatar name={p.clients?.name ?? "?"} size={36} />
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-[#2C1A1E] truncate">{p.clients?.name}</span>
                        <span className="block text-xs text-[#8F7479] truncate">{p.name}</span>
                      </span>
                    </Link>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-[#8F7479] mb-1.5">
                        <span>{p.sessions_used} de {p.sessions_total} sessões · {p.sessions_scheduled} agendadas</span>
                        <span className="p-num">{brl(p.price)}</span>
                      </div>
                      <Progress value={Number(p.sessions_used)} max={p.sessions_total} color={Number(p.sessions_remaining) <= 1 ? "#C9973A" : "#C8737A"} />
                    </div>
                    <div className="flex items-center gap-2 sm:w-44 justify-end">
                      {p.status !== "ativo" ? <Badge tone="gray">{p.status}</Badge>
                        : daysLeft !== null && daysLeft < 0 ? <Badge tone="red">vencido</Badge>
                        : daysLeft !== null && daysLeft <= 30 ? <Badge tone="gold">vence {fmtDate(p.expires_on, { year: undefined })}</Badge>
                        : <Badge tone="green">{p.sessions_remaining} restantes</Badge>}
                      {p.status === "ativo" && <Link href={`/painel/agenda?cliente=${p.client_id}`} className="p-btn-ghost p-btn-sm">Agendar</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Catálogo" eyebrow="Pacotes à venda" bodyClassName="p-3">
          {catalog.length === 0 ? <EmptyState icon={Package}>Crie seu primeiro pacote.</EmptyState> : (
            <ul className="flex flex-col gap-2">
              {catalog.map((p) => {
                const svc = serviceById.get(p.service_id);
                const full = svc ? Number(svc.price) * p.sessions : 0;
                const discount = full > 0 ? Math.round((1 - Number(p.price) / full) * 100) : null;
                return (
                  <li key={p.id}>
                    <Link href={`/painel/pacotes?editar=${p.id}`} scroll={false} className={`block rounded-xl border border-[#F1E5E2] px-4 py-3 hover:border-[#E3C4C8] ${p.active ? "" : "opacity-60"}`}>
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-bold text-[#2C1A1E]">{p.name}</p>
                        <p className="p-num text-sm">{brl(p.price)}</p>
                      </div>
                      <p className="text-xs text-[#8F7479] mt-0.5">
                        {p.sessions} sessões · {brl(Number(p.price) / p.sessions)}/sessão
                        {discount !== null && discount > 0 && <> · <span className="text-[#1F6B3A] font-bold">{discount}% off</span></>}
                        {p.validity_days && ` · ${p.validity_days} dias`}
                        {!p.active && " · inativo"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {(sp.novo === "1" || editing) && (
        <Drawer title={editing ? "Editar pacote" : "Novo pacote"} eyebrow="Catálogo" closeHref="/painel/pacotes">
          <PackageForm pkg={editing} services={services} />
        </Drawer>
      )}

      {sp.vender === "1" && (
        <Drawer title="Vender pacote" eyebrow="Venda" closeHref="/painel/pacotes">
          {catalog.filter((p) => p.active).length === 0 ? (
            <EmptyState icon={Package}>Crie um pacote no catálogo primeiro.</EmptyState>
          ) : (
            <ActionForm action={sellPackage} resetOnSuccess className="flex flex-col gap-3">
              <label>
                <span className="p-label">Cliente</span>
                <select name="client_id" required defaultValue="" className="p-input">
                  <option value="" disabled>Selecione…</option>
                  {(clientsRes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>
                <span className="p-label">Pacote</span>
                <select name="package_id" required className="p-input">
                  {catalog.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name} · {brl(p.price)}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="p-label">Valor (vazio = tabela)</span><input name="price" inputMode="decimal" className="p-input p-num" /></label>
                <label><span className="p-label">Data da venda</span><input type="date" name="purchased_on" defaultValue={today} className="p-input" /></label>
                <label>
                  <span className="p-label">Forma</span>
                  <select name="method" defaultValue="pix" className="p-input">{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label><span className="p-label">Parcelas</span><input type="number" name="installments" min={1} max={12} defaultValue={1} className="p-input p-num" /></label>
              </div>
              <label>
                <span className="p-label">Pagamento</span>
                <select name="payment" defaultValue="pago" className="p-input">
                  <option value="pago">Recebido (1ª parcela agora; no crédito, todas)</option>
                  <option value="pendente">Tudo a receber</option>
                </select>
              </label>
              <label><span className="p-label">Observações</span><input name="notes" className="p-input" /></label>
              <div><SubmitButton className="p-btn p-btn-gold">Registrar venda</SubmitButton></div>
            </ActionForm>
          )}
        </Drawer>
      )}
    </>
  );
}
