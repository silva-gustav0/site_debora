import { getActivePromotions } from "@/lib/site";
import PromoNotice from "./PromoNotice";
import SiteWhatsApp, { clinicWhatsapp } from "./SiteWhatsApp";

/** Itens flutuantes das páginas públicas: aviso da promoção (se houver), balão do WhatsApp e janela da conta. */
export default async function PromoNoticeSlot() {
  const [promos, phone] = await Promise.all([getActivePromotions(), clinicWhatsapp()]);
  const promo = promos.find((p) => p.show_as_notice);
  return (
    <>
      {promo && <PromoNotice promo={promo} phone={phone} />}
      <SiteWhatsApp phone={phone} />
    </>
  );
}
