import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PromoNoticeSlot from "@/components/PromoNoticeSlot";
import AnimateIn from "@/components/AnimateIn";
import VoucherPurchase from "@/components/VoucherPurchase";
import { getHomeServices, getSiteContent } from "@/lib/site";
import { getPublicConfig } from "@/app/actions/public";
import { getVoucherOffers } from "@/app/actions/vouchers";
import { DEFAULT_HOURS, hoursSummary } from "@/lib/hours";
import { VOUCHER_MAX, VOUCHER_MIN, VOUCHER_MONTHS } from "@/lib/vouchers";
import { CalendarHeart, CreditCard, Gift } from "lucide-react";

export const revalidate = 300;

export async function generateMetadata() {
  const { brand } = await getSiteContent();
  return {
    title: `Vale-presente | ${brand.full_name}`,
    description: `Presenteie com bem-estar: vale-presente da ${brand.full_name} para um serviço ou um valor. Pague com Pix ou cartão em até 12x e receba o código na hora.`,
  };
}

const STEPS = [
  { icon: Gift, title: "Escolha", text: "Um serviço especial ou um valor para usar como quiser." },
  { icon: CreditCard, title: "Pague com Pix ou cartão", text: "Pagamento seguro, com cartão em até 12x." },
  { icon: CalendarHeart, title: "Receba e agende", text: "O código e o QR code aparecem na hora, prontos para agendar." },
];

const lato = { fontFamily: "var(--font-lato), sans-serif" } as const;
const cormorant = { fontFamily: "var(--font-cormorant), serif" } as const;

export default async function VouchersPage() {
  const [content, services, config, offers] = await Promise.all([
    getSiteContent(), getHomeServices(), getPublicConfig(), getVoucherOffers(),
  ]);
  const { brand } = content;

  return (
    <>
      <Navbar logo={brand.logo} name={brand.full_name} hidden={content.layout.hidden} />
      <main>
        {/* Header */}
        <section
          className="relative pt-32 sm:pt-36 pb-16 sm:pb-20 overflow-hidden"
          style={{ background: "linear-gradient(135deg,#FBF7EE 0%,#FDFAF7 50%,#FFF8E7 100%)" }}
        >
          <div aria-hidden className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full" style={{ background: "radial-gradient(circle, rgba(232,200,130,0.22) 0%, transparent 65%)" }} />
          <div className="relative max-w-6xl mx-auto px-6 lg:px-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
            <div className="text-center lg:text-left">
              <span className="section-label">Vale-presente</span>
              <h1 className="text-5xl sm:text-6xl font-light text-bronze-900 mt-4 mb-5 leading-[1.05]" style={cormorant}>
                Presenteie com <em className="italic font-normal" style={{ color: "#9A6F1E" }}>bem-estar</em>
              </h1>
              <div className="gold-line mx-auto lg:mx-0 mb-6" />
              <p className="text-base font-light text-text-secondary max-w-md mx-auto lg:mx-0 leading-7" style={lato}>
                Um momento de cuidado é um dos presentes mais bonitos. Escolha um serviço ou um valor e
                receba na hora um cartão com código e QR code — é só entregar, enviar pelo WhatsApp ou imprimir.
              </p>
            </div>

            {/* Prévia do cartão */}
            <AnimateIn animation="scale" className="hidden sm:block">
              <div className="relative mx-auto max-w-[400px] aspect-[1.6/1] rotate-[-4deg]">
                <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-[6deg] rounded-2xl" style={{ background: "linear-gradient(135deg,#EEDFBF,#F6EEDB)", border: "1px solid #E8C882" }} />
                <div
                  className="relative h-full rounded-2xl p-7 flex flex-col justify-between overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #2B221B 0%, #3B2E24 55%, #2B221B 100%)", border: "1px solid rgba(201,151,58,0.45)", boxShadow: "0 30px 60px -25px rgba(43,34,27,0.6)" }}
                >
                  <div aria-hidden className="absolute -top-16 -right-16 w-44 h-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,200,130,0.25) 0%, transparent 70%)" }} />
                  <div aria-hidden className="absolute inset-2 rounded-xl" style={{ border: "1px solid rgba(232,200,130,0.16)" }} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-[9.5px] tracking-[0.32em] uppercase" style={{ ...lato, color: "#C9973A" }}>Vale-presente</p>
                      <p className="text-[26px] font-light text-white mt-1.5 leading-none" style={cormorant}>Um momento seu</p>
                    </div>
                    <Gift size={22} style={{ color: "#E8C882" }} />
                  </div>
                  <div className="relative">
                    <p className="text-[18px] tracking-[0.3em]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#E8C882" }}>DS-••••-••••</p>
                    <p className="text-[10px] tracking-[0.25em] uppercase mt-2" style={{ ...lato, color: "rgba(255,255,255,0.45)" }}>{brand.full_name}</p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Como funciona */}
          <ol className="relative max-w-6xl mx-auto px-6 lg:px-10 mt-14 grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <AnimateIn key={s.title} as="li" animation="up" delay={i * 100}>
                <div className="h-full flex items-start gap-4 rounded-2xl p-5 bg-white/70 backdrop-blur" style={{ border: "1px solid #EEDFBF" }}>
                  <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#C9973A,#E8C882)" }}>
                    <s.icon size={17} className="text-white" />
                  </span>
                  <div>
                    <p className="text-[10px] tracking-[0.25em] uppercase" style={{ ...lato, color: "#C9973A" }}>Passo {i + 1}</p>
                    <p className="text-xl font-light text-bronze-800 leading-tight mt-0.5" style={cormorant}>{s.title}</p>
                    <p className="text-[12.5px] font-light leading-5 text-text-muted mt-1" style={lato}>{s.text}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </ol>
        </section>

        <section className="py-16 sm:py-20 bg-[#FDFAF7]">
          <div className="max-w-6xl mx-auto px-6 lg:px-10">
            <VoucherPurchase offers={offers} min={VOUCHER_MIN} max={VOUCHER_MAX} months={VOUCHER_MONTHS} />
          </div>
        </section>
      </main>
      <Footer
        brand={brand} contact={content.contact} footer={content.footer} services={services} hidden={content.layout.hidden}
        hours={hoursSummary(config?.hours ?? DEFAULT_HOURS)}
      />
      <PromoNoticeSlot />
    </>
  );
}
