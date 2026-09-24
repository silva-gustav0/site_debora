import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarPlus, Check, ClipboardList, FileSignature, Images, MessageCircle, NotebookPen, Package, Printer, ShieldAlert, Trash2,
} from "lucide-react";
import { requireStaff } from "@/lib/dal";
import { APPT_SELECT, listServices } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import {
  brl, dateSP, diffDays, fillTemplate, firstName, fmtDate, fmtTime, formatPhone, INTERACTION_LABEL, METHOD_LABEL, nowMs, SOURCE_LABEL, todaySP, whatsappLink,
} from "@/lib/format";
import { computeRecurrence, RECURRENCE_META } from "@/lib/recurrence";
import ActionForm from "@/components/painel/ActionForm";
import AnamnesisForm, { FITZPATRICK } from "@/components/painel/AnamnesisForm";
import ClientForm from "@/components/painel/ClientForm";
import ConfirmButton from "@/components/painel/ConfirmButton";
import PhotoUploader from "@/components/painel/PhotoUploader";
import SubmitButton from "@/components/painel/SubmitButton";
import { Alert, Avatar, Badge, Card, EmptyState, Progress, StageBadge, StatTile, StatusBadge, Tabs } from "@/components/painel/ui";
import {
  addInteraction, addSessionRecord, completeInteraction, deleteClientAction, deleteInteraction, deletePhoto,
  deleteSessionRecord, sellPackage, setClientPackageStatus, setConsent,
} from "../../../actions";
import type {
  AppointmentWithRefs, ClientPackage, ClientPhoto, ClientRow, ClientStats, InteractionRow, PackageRow, SessionRecord, TransactionRow,
} from "@/lib/types";

const TABS = [
  { key: "resumo", label: "Resumo" },
  { key: "anamnese", label: "Anamnese" },
  { key: "evolucao", label: "Evolução" },
  { key: "fotos", label: "Fotos" },
  { key: "pacotes", label: "Pacotes" },
  { key: "financeiro", label: "Histórico & pagamentos" },
  { key: "relacionamento", label: "Relacionamento" },
  { key: "dados", label: "Dados" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default async function ClientPage({ params, searchParams }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const tab: TabKey = TABS.some((t) => t.key === sp.tab) ? (sp.tab as TabKey) : "resumo";
  const { supabase } = await requireStaff();
  const today = todaySP();

  const [clientRes, statsRes, apptRes, txRes, intRes, recRes, photoRes, pkgRes, catalogRes, services, settings] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase.from("client_stats").select("*").eq("client_id", id).maybeSingle(),
    supabase.from("appointments").select(APPT_SELECT).eq("client_id", id).order("starts_at", { ascending: false }),
    supabase.from("transactions").select("*").eq("client_id", id).order("occurred_on", { ascending: false }),
    supabase.from("interactions").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("session_records").select("*").eq("client_id", id).order("record_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("client_photos").select("*").eq("client_id", id).order("taken_on", { ascending: false }),
    supabase.from("client_package_usage").select("*").eq("client_id", id).order("purchased_on", { ascending: false }),
    supabase.from("packages").select("*").eq("active", true).order("name"),
    listServices(supabase),
    getSettings(supabase),
  ]);
  const client = clientRes.data as ClientRow | null;
  if (!client) notFound();

  const stats = (statsRes.data ?? undefined) as ClientStats | undefined;
  const appts = (apptRes.data ?? []) as AppointmentWithRefs[];
  const txs = (txRes.data ?? []) as TransactionRow[];
  const interactions = (intRes.data ?? []) as InteractionRow[];
  const records = (recRes.data ?? []) as SessionRecord[];
  const photos = (photoRes.data ?? []) as ClientPhoto[];
  const pkgs = (pkgRes.data ?? []) as ClientPackage[];
  const catalog = (catalogRes.data ?? []) as PackageRow[];
  const lastService = services.find((s) => s.id === stats?.last_service_id);
  const rec = computeRecurrence(stats, lastService?.return_days, today);
  const visits = Number(stats?.visits ?? 0);
  const spent = Number(stats?.total_spent ?? 0);
  const upcoming = appts.filter((a) => (a.status === "solicitado" || a.status === "confirmado") && Date.parse(a.ends_at) > nowMs()).reverse();
  const activePkgs = pkgs.filter((p) => p.status === "ativo");
  const pendingTx = txs.filter((t) => t.status === "pendente" && t.kind === "receita");
  const a = client.anamnesis ?? {};

  const photoUrls = new Map<string, string>();
  if (tab === "fotos" && photos.length) {
    const { data } = await supabase.storage.from("client-photos").createSignedUrls(photos.map((p) => p.path), 3600);
    data?.forEach((d, i) => d.signedUrl && photoUrls.set(photos[i].path, d.signedUrl));
  }

  const wa = whatsappLink(client.phone, `Oi, ${firstName(client.name)}! Aqui é da ${settings.clinic_name} 🌸`);
  const age = client.birth_date ? Math.floor(diffDays(client.birth_date, today) / 365.25) : null;
  const warnings = [
    a.pregnant && "Gestante",
    a.breastfeeding && "Amamentando",
    a.uses_acids && "Usa ácidos/retinoides",
    ...(a.conditions ?? []),
    (client.allergies || a.allergies_detail) && `Alergias: ${a.allergies_detail ?? client.allergies}`,
  ].filter(Boolean) as string[];
  const tabHref = (k: string) => `/painel/clientes/${client.id}${k === "resumo" ? "" : `?tab=${k}`}`;

  return (
    <>
      <Link href="/painel/clientes" className="inline-flex items-center gap-1 text-sm text-[#857566] hover:text-[#6B4A10] mb-4">
        <ArrowLeft size={14} /> Clientes
      </Link>

      {/* Cabeçalho */}
      <header className="p-card p-card-gold p-5 sm:p-6 mb-5 p-rise">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Avatar name={client.name} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="p-display text-4xl font-light text-[#2B221B] leading-none">{client.name}</h1>
                <StageBadge stage={client.stage} />
                {client.consent_signed_at ? <Badge tone="green"><FileSignature size={11} /> Termo assinado</Badge> : <Badge tone="gold">Termo pendente</Badge>}
              </div>
              <p className="text-sm text-[#857566] mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {client.phone && <span className="p-num">{formatPhone(client.phone)}</span>}
                {client.email && <span>{client.email}</span>}
                {age !== null && <span>{age} anos</span>}
                {a.fitzpatrick && <span>Fototipo {a.fitzpatrick}</span>}
                <span>Via {SOURCE_LABEL[client.source]} · desde {fmtDate(client.created_at, { month: "short" })}</span>
              </p>
              {client.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{client.tags.map((t) => <Badge key={t} tone="bronze">{t}</Badge>)}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="p-btn-ghost"><MessageCircle size={14} /> WhatsApp</a>}
            <Link href={`/painel/clientes/${client.id}/termo`} className="p-btn-ghost"><Printer size={14} /> Ficha / termo</Link>
            <Link href={`/painel/agenda?cliente=${client.id}`} className="p-btn"><CalendarPlus size={14} /> Agendar</Link>
          </div>
        </div>
        {warnings.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm" style={{ background: "#FDECEC", border: "1px solid #F2C1C1", color: "#7A1F1F" }}>
            <ShieldAlert size={16} className="mt-0.5 shrink-0" /> <span><strong>Atenção:</strong> {warnings.join(" · ")}</span>
          </div>
        )}
      </header>

      <Tabs current={tab} tabs={TABS.map((t) => ({ key: t.key, label: t.label, href: tabHref(t.key) }))} />

      {tab === "resumo" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <StatTile label="Visitas" value={visits} hint={Number(stats?.no_shows) ? `${stats?.no_shows} faltas` : "nenhuma falta"} />
            <StatTile label="Total investido" value={brl(spent)} hint={visits ? `ticket ${brl(spent / visits)}` : undefined} />
            <StatTile label="Última visita" value={rec.lastVisit ? fmtDate(rec.lastVisit, { year: "2-digit" }) : "—"} hint={rec.daysSinceLast !== null ? `há ${rec.daysSinceLast} dias` : undefined} />
            <StatTile label="Frequência" value={`${rec.interval}d`} hint={rec.learned ? "média real" : "sugerida pelo serviço"} />
            <StatTile
              label="Próximo retorno"
              value={stats?.next_appointment ? fmtDate(stats.next_appointment, { year: "2-digit" }) : rec.dueDate ? fmtDate(rec.dueDate, { year: "2-digit" }) : "—"}
              hint={<Badge tone={RECURRENCE_META[rec.status].tone}>{RECURRENCE_META[rec.status].label}</Badge>}
              tone={rec.status === "atrasada" ? "warn" : "default"}
            />
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <Card title="Próximos horários" bodyClassName="p-3">
              {upcoming.length === 0 ? <EmptyState>Sem horários marcados.</EmptyState> : (
                <ul className="flex flex-col gap-2">
                  {upcoming.map((ap) => (
                    <li key={ap.id}>
                      <Link href={`/painel/agenda?d=${dateSP(ap.starts_at)}&a=${ap.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-[#F0E8DB] px-3 py-2 hover:bg-[#FDFAF5]">
                        <span className="text-sm"><strong className="p-num">{fmtDate(ap.starts_at, { year: undefined })} {fmtTime(ap.starts_at)}</strong> · {ap.services?.name}</span>
                        <StatusBadge status={ap.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Pacotes ativos" action={<Link href={tabHref("pacotes")} className="text-xs text-[#82590F] hover:underline">Gerenciar</Link>}>
              {activePkgs.length === 0 ? <EmptyState icon={Package}>Nenhum pacote ativo.</EmptyState> : (
                <ul className="flex flex-col gap-4">
                  {activePkgs.map((p) => (
                    <li key={p.id}>
                      <div className="flex justify-between text-sm mb-1.5"><span>{p.name}</span><span className="p-num text-[#857566]">{p.sessions_used}/{p.sessions_total}</span></div>
                      <Progress value={Number(p.sessions_used)} max={p.sessions_total} />
                      {p.expires_on && <p className="text-[11px] text-[#857566] mt-1">Válido até {fmtDate(p.expires_on)}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {pendingTx.length > 0 && <div className="mt-4"><Alert>Há {pendingTx.length} parcela(s) a receber: {brl(pendingTx.reduce((s, t) => s + Number(t.amount), 0))}.</Alert></div>}
            </Card>
            <Card title="Última evolução" action={<Link href={tabHref("evolucao")} className="text-xs text-[#82590F] hover:underline">Prontuário</Link>}>
              {records[0] ? (
                <div className="text-sm">
                  <p className="text-xs text-[#857566] mb-1">{fmtDate(records[0].record_date)} · {records[0].procedure}</p>
                  <p className="text-[#2B221B] whitespace-pre-line line-clamp-6">{records[0].observations ?? records[0].parameters ?? "—"}</p>
                  {records[0].next_steps && <p className="text-xs mt-2 text-[#6B5A4B]"><strong>Próximos passos:</strong> {records[0].next_steps}</p>}
                </div>
              ) : <EmptyState icon={NotebookPen}>Nenhuma evolução registrada.</EmptyState>}
            </Card>
          </div>
        </>
      )}

      {tab === "anamnese" && (
        <div className="grid xl:grid-cols-[1fr_320px] gap-5">
          <Card title="Ficha de anamnese" eyebrow="Avaliação"><AnamnesisForm clientId={client.id} a={a} /></Card>
          <div className="flex flex-col gap-5">
            <Card title="Termo de consentimento">
              {client.consent_signed_at ? (
                <p className="text-sm text-[#1F6B3A] mb-3">Assinado em {fmtDate(client.consent_signed_at)}.</p>
              ) : (
                <p className="text-sm text-[#857566] mb-3">Imprima a ficha com o termo, colete a assinatura e marque como assinado.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Link href={`/painel/clientes/${client.id}/termo`} className="p-btn-ghost p-btn-sm"><Printer size={13} /> Imprimir</Link>
                <form action={setConsent}>
                  <input type="hidden" name="id" value={client.id} />
                  <input type="hidden" name="signed" value={client.consent_signed_at ? "0" : "1"} />
                  <SubmitButton className={client.consent_signed_at ? "p-btn-ghost p-btn-sm" : "p-btn p-btn-sm"}>
                    {client.consent_signed_at ? "Desmarcar" : <><Check size={13} /> Marcar como assinado</>}
                  </SubmitButton>
                </form>
              </div>
            </Card>
            <Card title="Guia de fototipos">
              <ul className="text-xs text-[#6B5A4B] flex flex-col gap-1">{FITZPATRICK.map((f) => <li key={f.v}>{f.l}</li>)}</ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "evolucao" && (
        <div className="grid xl:grid-cols-[380px_1fr] gap-5">
          <Card title="Nova evolução" eyebrow="Prontuário">
            <ActionForm action={addSessionRecord} resetOnSuccess className="flex flex-col gap-3">
              <input type="hidden" name="client_id" value={client.id} />
              <div className="grid grid-cols-2 gap-2">
                <label><span className="p-label">Data</span><input type="date" name="record_date" defaultValue={today} className="p-input" /></label>
                <label>
                  <span className="p-label">Atendimento</span>
                  <select name="appointment_id" className="p-input" defaultValue="">
                    <option value="">—</option>
                    {appts.filter((ap) => ap.status === "concluido").slice(0, 20).map((ap) => (
                      <option key={ap.id} value={ap.id}>{fmtDate(ap.starts_at, { year: "2-digit" })} · {ap.services?.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span className="p-label">Procedimento *</span>
                <input name="procedure" required list="procedures" className="p-input" />
                <datalist id="procedures">{services.map((s) => <option key={s.id} value={s.name} />)}</datalist>
              </label>
              <label><span className="p-label">Produtos / ativos utilizados</span><textarea name="products_used" rows={2} className="p-input resize-y" /></label>
              <label><span className="p-label">Parâmetros (tempo, intensidade, concentração)</span><input name="parameters" className="p-input" /></label>
              <label><span className="p-label">Observações e reação da pele</span><textarea name="observations" rows={3} className="p-input resize-y" /></label>
              <label><span className="p-label">Orientações / próximos passos</span><textarea name="next_steps" rows={2} className="p-input resize-y" /></label>
              <div><SubmitButton>Registrar evolução</SubmitButton></div>
            </ActionForm>
          </Card>
          <Card title="Linha do tempo do tratamento" eyebrow={`${records.length} registros`}>
            {records.length === 0 ? <EmptyState icon={ClipboardList}>Nenhuma evolução ainda. Registre ao concluir cada sessão.</EmptyState> : (
              <ol className="relative border-l-2 border-[#F0E7DA] ml-3 flex flex-col gap-6">
                {records.map((r) => (
                  <li key={r.id} className="pl-6 relative">
                    <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white" style={{ background: "linear-gradient(135deg,#E8C882,#C9973A)" }} />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="p-display text-xl text-[#2B221B]">{r.procedure}</p>
                      <span className="text-xs text-[#857566]">{fmtDate(r.record_date)}</span>
                    </div>
                    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-2 text-sm">
                      {r.products_used && <div><dt className="p-label mb-0.5">Produtos</dt><dd className="whitespace-pre-line">{r.products_used}</dd></div>}
                      {r.parameters && <div><dt className="p-label mb-0.5">Parâmetros</dt><dd>{r.parameters}</dd></div>}
                      {r.observations && <div className="sm:col-span-2"><dt className="p-label mb-0.5">Observações</dt><dd className="whitespace-pre-line">{r.observations}</dd></div>}
                      {r.next_steps && <div className="sm:col-span-2"><dt className="p-label mb-0.5">Próximos passos</dt><dd className="whitespace-pre-line">{r.next_steps}</dd></div>}
                    </dl>
                    <form action={deleteSessionRecord} className="mt-2">
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton confirmText="Excluir registro"><Trash2 size={12} /></ConfirmButton>
                    </form>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      )}

      {tab === "fotos" && (
        <div className="grid xl:grid-cols-[340px_1fr] gap-5">
          <div className="flex flex-col gap-3">
            <PhotoUploader clientId={client.id} />
            <p className="text-xs text-[#857566] px-1">As fotos ficam em armazenamento privado e só aparecem para a equipe logada. Peça autorização da cliente antes de usar em divulgação.</p>
          </div>
          <Card title="Antes e depois" eyebrow={`${photos.length} fotos`}>
            {photos.length === 0 ? <EmptyState icon={Images}>Nenhuma foto ainda.</EmptyState> : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <figure key={p.id} className="group relative rounded-xl overflow-hidden bg-[#F5EEE3] aspect-[3/4]">
                    {photoUrls.get(p.path) && (
                      // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do Storage
                      <a href={photoUrls.get(p.path)} target="_blank" rel="noopener noreferrer"><img src={photoUrls.get(p.path)} alt={p.caption ?? `Foto ${p.kind}`} className="w-full h-full object-cover" /></a>
                    )}
                    <figcaption className="absolute inset-x-0 bottom-0 p-2 text-[11px] text-white" style={{ background: "linear-gradient(transparent, rgba(41,32,26,.8))" }}>
                      <strong className="uppercase tracking-wider">{p.kind}</strong> · {fmtDate(p.taken_on, { year: "2-digit" })}
                      {p.caption && <span className="block truncate">{p.caption}</span>}
                    </figcaption>
                    <form action={deletePhoto} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input type="hidden" name="id" value={p.id} />
                      <ConfirmButton confirmText="Excluir"><Trash2 size={12} /></ConfirmButton>
                    </form>
                  </figure>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "pacotes" && (
        <div className="grid xl:grid-cols-[360px_1fr] gap-5">
          <Card title="Vender pacote" eyebrow="Pacotes">
            {catalog.length === 0 ? (
              <EmptyState icon={Package}>Cadastre pacotes em <Link href="/painel/pacotes" className="underline">Pacotes</Link>.</EmptyState>
            ) : (
              <ActionForm action={sellPackage} className="flex flex-col gap-3">
                <input type="hidden" name="client_id" value={client.id} />
                <label>
                  <span className="p-label">Pacote</span>
                  <select name="package_id" required className="p-input">
                    {catalog.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sessions} sessões · {brl(p.price)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="p-label">Valor (vazio = tabela)</span><input name="price" inputMode="decimal" className="p-input p-num" /></label>
                  <label><span className="p-label">Data</span><input type="date" name="purchased_on" defaultValue={today} className="p-input" /></label>
                  <label>
                    <span className="p-label">Forma</span>
                    <select name="method" defaultValue="pix" className="p-input">{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </label>
                  <label><span className="p-label">Parcelas</span><input type="number" name="installments" min={1} max={12} defaultValue={1} className="p-input p-num" /></label>
                </div>
                <label>
                  <span className="p-label">Pagamento</span>
                  <select name="payment" defaultValue="pago" className="p-input">
                    <option value="pago">Recebido (1ª parcela agora)</option>
                    <option value="pendente">A receber</option>
                  </select>
                </label>
                <div><SubmitButton>Registrar venda</SubmitButton></div>
              </ActionForm>
            )}
          </Card>
          <Card title="Pacotes da cliente">
            {pkgs.length === 0 ? <EmptyState icon={Package}>Nenhum pacote.</EmptyState> : (
              <ul className="flex flex-col gap-4">
                {pkgs.map((p) => (
                  <li key={p.id} className="rounded-xl border border-[#F0E8DB] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="p-display text-xl">{p.name}</p>
                      <Badge tone={p.status === "ativo" ? "green" : p.status === "concluido" ? "blue" : "gray"}>{p.status}</Badge>
                    </div>
                    <Progress value={Number(p.sessions_used)} max={p.sessions_total} />
                    <p className="text-xs text-[#857566] mt-2">
                      {p.sessions_used} realizadas · {p.sessions_scheduled} agendadas · {p.sessions_remaining} restantes · comprado em {fmtDate(p.purchased_on)} por {brl(p.price)}
                      {p.expires_on && ` · validade ${fmtDate(p.expires_on)}`}
                    </p>
                    {p.status === "ativo" && (
                      <div className="flex gap-2 mt-3">
                        <Link href={`/painel/agenda?cliente=${client.id}`} className="p-btn p-btn-sm">Agendar sessão</Link>
                        <form action={setClientPackageStatus}>
                          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value="cancelado" />
                          <ConfirmButton confirmText="Cancelar pacote">Cancelar</ConfirmButton>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {tab === "financeiro" && (
        <div className="grid xl:grid-cols-2 gap-5">
          <Card title="Atendimentos" eyebrow={`${appts.length} no total`} bodyClassName="overflow-x-auto">
            {appts.length === 0 ? <EmptyState>Nenhum atendimento ainda.</EmptyState> : (
              <table className="p-table">
                <thead><tr><th>Data</th><th>Serviço</th><th>Situação</th><th className="text-right">Valor</th></tr></thead>
                <tbody>
                  {appts.map((ap) => (
                    <tr key={ap.id}>
                      <td className="whitespace-nowrap p-num"><Link href={`/painel/agenda?d=${dateSP(ap.starts_at)}&a=${ap.id}`} className="hover:underline">{fmtDate(ap.starts_at, { year: "2-digit" })} {fmtTime(ap.starts_at)}</Link></td>
                      <td>{ap.services?.name}{ap.client_package_id && <span className="ml-1"><Badge tone="plum">pacote</Badge></span>}</td>
                      <td><StatusBadge status={ap.status} /></td>
                      <td className="text-right p-num">{brl(ap.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title="Pagamentos" eyebrow={`${brl(spent)} recebidos`} bodyClassName="overflow-x-auto">
            {txs.length === 0 ? <EmptyState>Nenhum pagamento registrado.</EmptyState> : (
              <table className="p-table">
                <thead><tr><th>Data</th><th>Descrição</th><th>Forma</th><th>Situação</th><th className="text-right">Valor</th></tr></thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id}>
                      <td className="p-num whitespace-nowrap">{fmtDate(t.occurred_on, { year: "2-digit" })}</td>
                      <td>{t.description ?? t.category}</td>
                      <td>{METHOD_LABEL[t.method]}</td>
                      <td>{t.status === "pendente" ? <Badge tone="gold">a receber</Badge> : <Badge tone="green">pago</Badge>}</td>
                      <td className="text-right p-num">{brl(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === "relacionamento" && (
        <div className="grid xl:grid-cols-[360px_1fr] gap-5">
          <Card title="Registrar contato">
            <ActionForm action={addInteraction} resetOnSuccess className="flex flex-col gap-3">
              <input type="hidden" name="client_id" value={client.id} />
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="p-label">Tipo</span>
                  <select name="kind" defaultValue="nota" className="p-input">
                    <option value="nota">Nota</option><option value="whatsapp">WhatsApp</option><option value="ligacao">Ligação</option><option value="followup">Tarefa</option>
                  </select>
                </label>
                <label><span className="p-label">Lembrar em</span><input type="date" name="due_on" min={today} className="p-input" /></label>
              </div>
              <textarea name="content" rows={3} required placeholder="O que foi conversado, preferências, próximos passos…" className="p-input resize-y" aria-label="Anotação" />
              <div><SubmitButton>Registrar</SubmitButton></div>
            </ActionForm>
            {client.phone && (
              <div className="mt-5 pt-4 border-t border-[#F5EEE3]">
                <p className="p-label">Mensagens prontas</p>
                <div className="flex flex-wrap gap-2">
                  {(["retorno", "reativacao", "aniversario"] as const).map((k) => (
                    <a key={k} href={whatsappLink(client.phone, fillTemplate(settings.templates[k], { nome: firstName(client.name), servico: lastService?.name ?? "tratamento", clinica: settings.clinic_name })) ?? "#"} target="_blank" rel="noopener noreferrer" className="p-btn-ghost p-btn-sm">
                      <MessageCircle size={12} /> {{ retorno: "Retorno", reativacao: "Reativação", aniversario: "Aniversário" }[k]}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
          <Card title="Histórico de relacionamento" eyebrow={`${interactions.length} registros`}>
            {interactions.length === 0 ? <EmptyState>Sem registros ainda.</EmptyState> : (
              <ol className="relative border-l-2 border-[#F0E7DA] ml-2 flex flex-col gap-4">
                {interactions.map((i) => {
                  const openTask = i.due_on && !i.done_at;
                  return (
                    <li key={i.id} className="pl-5 relative">
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: openTask ? "#D4A73C" : "#E6D8BC" }} />
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#857566]">
                        <strong className="text-[#2B221B]">{INTERACTION_LABEL[i.kind]}</strong>
                        <span>· {fmtDate(i.created_at)} {fmtTime(i.created_at)}</span>
                        {openTask && <Badge tone={i.due_on! < today ? "red" : "gold"}>Lembrar {fmtDate(i.due_on, { year: undefined })}</Badge>}
                        {i.due_on && i.done_at && <Badge tone="green">Feito</Badge>}
                      </div>
                      <p className="text-sm text-[#2B221B] whitespace-pre-line mt-0.5">{i.content}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        {openTask && (
                          <form action={completeInteraction}>
                            <input type="hidden" name="id" value={i.id} />
                            <SubmitButton className="p-btn-ghost p-btn-sm"><Check size={12} /> Feito</SubmitButton>
                          </form>
                        )}
                        <form action={deleteInteraction}>
                          <input type="hidden" name="id" value={i.id} />
                          <ConfirmButton confirmText="Excluir"><Trash2 size={12} /></ConfirmButton>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>
      )}

      {tab === "dados" && (
        <div className="flex flex-col gap-5">
          <Card title="Dados cadastrais"><ClientForm client={client} /></Card>
          <Card title="Excluir cliente" eyebrow="Zona de risco">
            <p className="text-sm text-[#857566] mb-3">Remove a cliente com agendamentos, prontuário, fotos e anotações (direito de exclusão da LGPD). Os lançamentos financeiros permanecem, sem vínculo.</p>
            <form action={deleteClientAction}>
              <input type="hidden" name="id" value={client.id} />
              <ConfirmButton confirmText="Excluir definitivamente"><Trash2 size={13} /> Excluir cliente</ConfirmButton>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
