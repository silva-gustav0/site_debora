import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarHeart, Gift, MessageCircle, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getHomeServices, getSiteContent } from "@/lib/site";
import { getPublicConfig } from "@/app/actions/public";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { getSettings } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { brl, firstName, fmtDate, SITE_URL, whatsappLink } from "@/lib/format";
import { openAppointmentFor, STATE_LABEL, voucherPath, voucherState, type VoucherRow, type VoucherState, navHidden } from "@/lib/vouchers";
import { CopyCode, PaymentWatcher, PrintButton } from "./VoucherClient";
import SiteWhatsApp from "@/components/SiteWhatsApp";

// O status muda quando o pagamento é confirmado: sempre renderiza na hora.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vale-presente · Clínica Débora Silva",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BADGE: Record<VoucherState, { bg: string; fg: string; dot: string }> = {
  pendente: { bg: "rgba(232,200,130,0.14)", fg: "#E8C882", dot: "#E8C882" },
  ativo: { bg: "rgba(126,196,150,0.14)", fg: "#A9DDBA", dot: "#7EC496" },
  agendado: { bg: "rgba(232,200,130,0.14)", fg: "#E8C882", dot: "#E8C882" },
  usado: { bg: "rgba(255,255,255,0.08)", fg: "rgba(255,255,255,0.65)", dot: "rgba(255,255,255,0.5)" },
  expirado: { bg: "rgba(230,120,120,0.14)", fg: "#F0B4B4", dot: "#E07A7A" },
  cancelado: { bg: "rgba(230,120,120,0.14)", fg: "#F0B4B4", dot: "#E07A7A" },
};

const lato = { fontFamily: "var(--font-lato), sans-serif" } as const;
const cormorant = { fontFamily: "var(--font-cormorant), serif" } as const;
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" } as const;

export default async function VoucherPage({ params }: PageProps<"/voucher/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const db = createAdminClient();
  if (!db) notFound();

  const [content, services, config, settings, { data }] = await Promise.all([
    getSiteContent(), getHomeServices(), getPublicConfig(), getSettings(db),
    db.from("vouchers").select("*").eq("order_nsu", id).maybeSingle(),
  ]);
  const raw = data as VoucherRow | null;
  if (!raw) notFound();
  const v: VoucherRow = { ...raw, amount: Number(raw.amount), balance: Number(raw.balance) };
  const { brand } = content;

  const pending = v.status === "pendente";
  const state = voucherState(v, pending ? false : Boolean(await openAppointmentFor(db, v.id)));
  const url = `${SITE_URL}${voucherPath(v)}`;
  const gift = !v.for_self && Boolean(v.recipient_name);

  const chrome = (children: React.ReactNode) => (
    <>
      <div className="print:hidden">
        <Navbar logo={brand.logo} name={brand.full_name} hidden={navHidden(content.layout.hidden)} />
      </div>
      <main
        className="min-h-[70vh] pt-32 sm:pt-36 pb-20 px-4 sm:px-6 bg-linear-to-br from-[#FBF7EE] via-[#FDFAF7] to-[#FFF8E7] print:bg-none print:bg-white print:pt-6 print:pb-0"
        style={lato}
      >
        {children}
      </main>
      <div className="print:hidden">
        <Footer
          brand={brand} contact={content.contact} footer={content.footer} services={services} hidden={content.layout.hidden}
          hours={hoursSummary(config?.hours ?? DEFAULT_HOURS)}
        />
        <SiteWhatsApp />
      </div>
    </>
  );

  // ─── Aguardando a confirmação do pagamento ────────────────────────────
  if (pending) {
    const wa = whatsappLink(settings.whatsapp, `Olá! Comprei um vale-presente pelo site (código ${v.code}) e ainda não recebi a confirmação.`);
    return chrome(
      <div className="max-w-lg mx-auto text-center">
        <span className="section-label">Vale-presente</span>
        <h1 className="text-4xl sm:text-5xl font-light text-bronze-900 mt-4 mb-5 leading-tight" style={cormorant}>
          Confirmando seu <em className="italic font-normal" style={{ color: "#9A6F1E" }}>pagamento</em>…
        </h1>
        <div className="gold-line mx-auto mb-8" />
        <div className="rounded-3xl bg-white px-6 py-10 sm:px-10" style={{ border: "1px solid #EEDFBF", boxShadow: "0 20px 60px rgba(107,74,16,0.10)" }}>
          <p className="text-[14px] leading-6 text-text-secondary mb-8">
            Assim que a InfinitePay confirmar, o seu vale-presente aparece aqui com o código e o QR code.
          </p>
          <PaymentWatcher whatsapp={wa} />
        </div>
      </div>,
    );
  }

  // ─── Cartão do vale-presente ──────────────────────────────────────────
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#2B221B", light: "#00000000" } });
  const badge = BADGE[state];
  const partial = v.kind === "valor" && v.balance < v.amount;
  const title = v.kind === "servico" ? v.service_name ?? "Serviço" : brl(v.balance);
  const shareText = gift
    ? `${firstName(v.recipient_name ?? "")}, você ganhou um vale-presente da ${brand.full_name}! 🎁\nCódigo: ${v.code}\nVeja o seu cartão e agende: ${url}`
    : `Meu vale-presente da ${brand.full_name}\nCódigo: ${v.code}\n${url}`;
  const share = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const heading = gift
    ? <>Um presente para <em className="italic font-normal" style={{ color: "#9A6F1E" }}>{firstName(v.recipient_name ?? "")}</em></>
    : <>Seu momento de <em className="italic font-normal" style={{ color: "#9A6F1E" }}>cuidado</em></>;

  const note: Partial<Record<VoucherState, string>> = {
    ativo: "Use o código ao agendar pelo site ou apresente o QR code na clínica.",
    agendado: "Já existe um agendamento com este vale-presente. Qualquer dúvida, fale com a gente pelo WhatsApp.",
    usado: "Este vale-presente já foi utilizado. Esperamos que tenha sido um momento especial!",
    expirado: "O prazo deste vale-presente terminou. Fale com a clínica pelo WhatsApp para ver o que podemos fazer.",
    cancelado: "Este vale-presente foi cancelado. Em caso de dúvida, fale com a clínica.",
  };
  const clinicWa = whatsappLink(settings.whatsapp, `Olá! Tenho uma dúvida sobre o vale-presente ${v.code}.`);

  return chrome(
    <div className="max-w-3xl mx-auto">
      <header className="text-center mb-10 print:mb-6">
        <span className="section-label">Vale-presente</span>
        <h1 className="text-4xl sm:text-5xl font-light text-bronze-900 mt-4 mb-5 leading-tight" style={cormorant}>{heading}</h1>
        <div className="gold-line mx-auto mb-5" />
        <p className="text-[14.5px] font-light leading-6 text-text-secondary max-w-md mx-auto">{note[state]}</p>
      </header>

      {/* Cartão */}
      <article
        className="relative rounded-[28px] overflow-hidden text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:shadow-none"
        style={{
          background: "linear-gradient(135deg, #2B221B 0%, #3B2E24 50%, #2B221B 100%)",
          border: "1px solid rgba(201,151,58,0.45)",
          boxShadow: "0 40px 90px -40px rgba(43,34,27,0.7)",
        }}
        aria-label={`Vale-presente ${v.code}`}
      >
        <div aria-hidden className="absolute -top-32 -right-24 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,200,130,0.22) 0%, transparent 70%)" }} />
        <div aria-hidden className="absolute -bottom-40 -left-24 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(201,151,58,0.14) 0%, transparent 70%)" }} />
        <div aria-hidden className="absolute inset-3 rounded-[20px] pointer-events-none" style={{ border: "1px solid rgba(232,200,130,0.18)" }} />
        <div aria-hidden className="absolute top-0 left-10 right-10 h-px" style={{ background: "linear-gradient(90deg, transparent, #E8C882, transparent)" }} />

        <div className="relative p-7 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 text-[10px] tracking-[0.32em] uppercase" style={{ color: "#C9973A" }}>
              <Gift size={13} /> {brand.full_name}
            </p>
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] tracking-[0.16em] uppercase whitespace-nowrap"
              style={{ background: badge.bg, color: badge.fg, border: `1px solid ${badge.dot}40` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: badge.dot }} />
              {STATE_LABEL[state]}
            </span>
          </div>

          <div className="mt-8 sm:mt-10 grid sm:grid-cols-[minmax(0,1fr)_auto] gap-8 sm:gap-10 items-end">
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.28em] uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
                {v.kind === "servico" ? "Vale-presente · serviço" : partial ? "Saldo disponível" : "Vale-presente"}
              </p>
              <h2 className="text-[40px] sm:text-[54px] font-light leading-[1.02] mt-2 break-words" style={{ ...cormorant, color: "#F7EBD3" }}>
                {title}
              </h2>
              {partial && (
                <p className="text-[13px] mt-2" style={{ color: "rgba(232,200,130,0.8)" }}>Saldo de {brl(v.amount)}</p>
              )}

              {gift && (
                <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-3">
                  <div>
                    <dt className="text-[10px] tracking-[0.24em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>Para</dt>
                    <dd className="text-[22px] font-light mt-0.5" style={{ ...cormorant, color: "#FFFFFF" }}>{v.recipient_name}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] tracking-[0.24em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>De</dt>
                    <dd className="text-[22px] font-light mt-0.5" style={{ ...cormorant, color: "#FFFFFF" }}>{v.buyer_name}</dd>
                  </div>
                </dl>
              )}

              {gift && v.message && (
                <blockquote className="mt-6 pl-4 max-w-md" style={{ borderLeft: "1.5px solid rgba(232,200,130,0.55)" }}>
                  <p className="text-[19px] italic font-light leading-7 whitespace-pre-line break-words" style={{ ...cormorant, color: "#F3E6CC" }}>
                    “{v.message}”
                  </p>
                </blockquote>
              )}
            </div>

            <div className="flex sm:flex-col items-center gap-4">
              <div
                className="w-[128px] sm:w-[148px] shrink-0 rounded-2xl p-2.5 [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
                style={{ background: "#FBF7EE", boxShadow: "0 0 0 1px rgba(232,200,130,0.5), 0 12px 30px -12px rgba(0,0,0,0.5)" }}
                role="img"
                aria-label="QR code do vale-presente"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
              <p className="text-[11px] leading-4 sm:text-center max-w-[150px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                Aponte a câmera para abrir este vale-presente
              </p>
            </div>
          </div>

          <div className="my-8 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(232,200,130,0.5), transparent)" }} />

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
            <div>
              <p className="text-[10px] tracking-[0.28em] uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>Código</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <p className="text-[26px] sm:text-[34px] font-medium tracking-[0.2em] select-all" style={{ ...mono, color: "#E8C882" }}>{v.code}</p>
                <CopyCode code={v.code} />
              </div>
            </div>
            <p className="text-[12px] tracking-[0.12em] uppercase sm:text-right" style={{ color: "rgba(255,255,255,0.6)" }}>
              {v.expires_on ? <>Válido até <span style={{ color: "#F7EBD3" }}>{fmtDate(v.expires_on)}</span></> : null}
            </p>
          </div>
        </div>
      </article>

      {/* Ações */}
      <div className="print:hidden mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
        {state === "ativo" && (
          <Link href={`/?voucher=${encodeURIComponent(v.code)}#agendamento`} className="btn-primary justify-center">
            <CalendarHeart size={14} /> Agendar com este voucher
          </Link>
        )}
        <a href={share} target="_blank" rel="noopener noreferrer" className="btn-outline justify-center">
          <MessageCircle size={14} /> Enviar pelo WhatsApp
        </a>
        <PrintButton />
      </div>

      {/* Como usar */}
      <section className="mt-12 print:mt-6 rounded-2xl bg-white/80 p-6 sm:p-8 print:p-0 print:bg-transparent" style={{ border: "1px solid #EEDFBF" }}>
        <p className="flex items-center gap-2 section-label"><Sparkles size={12} /> Como usar</p>
        <ol className="mt-5 grid sm:grid-cols-3 gap-5 text-[13px] leading-6 text-text-secondary">
          <li><span className="block text-2xl font-light" style={{ ...cormorant, color: "#C9973A" }}>01</span>Agende pelo site informando o código, ou fale com a clínica pelo WhatsApp.</li>
          <li><span className="block text-2xl font-light" style={{ ...cormorant, color: "#C9973A" }}>02</span>No dia, apresente o código ou o QR code na recepção.</li>
          <li>
            <span className="block text-2xl font-light" style={{ ...cormorant, color: "#C9973A" }}>03</span>
            {v.expires_on ? `Use até ${fmtDate(v.expires_on)}.` : "Use dentro da validade."}{" "}
            {v.kind === "valor" ? "Vale para qualquer serviço da clínica. Se o serviço custar menos, o saldo que sobrar continua no voucher; se custar mais, você paga só a diferença." : "Válido para o serviço indicado no cartão."}
          </li>
        </ol>
        {clinicWa && (
          <p className="print:hidden mt-6 text-[12.5px] text-text-muted">
            Dúvidas?{" "}
            <a href={clinicWa} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-bronze-600" style={{ color: "#9A6F1E" }}>
              Fale com a gente no WhatsApp
            </a>
          </p>
        )}
      </section>
    </div>,
  );
}
