import { getActivePromotions } from "@/lib/site";
import PromoNotice from "./PromoNotice";

/** Busca a promoção marcada como aviso fixo (se estiver no ar) e mostra o cartão flutuante. */
export default async function PromoNoticeSlot() {
  const promo = (await getActivePromotions()).find((p) => p.show_as_notice);
  return promo ? <PromoNotice promo={promo} /> : null;
}
