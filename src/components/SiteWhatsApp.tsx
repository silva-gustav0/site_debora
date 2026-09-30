import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/settings";
import { DEFAULT_SETTINGS } from "@/lib/settings-core";
import WhatsAppBubble from "./WhatsAppBubble";
import AccountLayer from "./AccountLayer";

/** Número da clínica (Configurações do painel) para o balão do WhatsApp das páginas públicas. */
export async function clinicWhatsapp() {
  const db = createAdminClient();
  return db ? (await getSettings(db)).whatsapp : DEFAULT_SETTINGS.whatsapp;
}

/** Balão do WhatsApp com o número atual da clínica e a janela de conta (cadastro/entrada) do site. */
export default async function SiteWhatsApp({ phone }: { phone?: string }) {
  const p = phone ?? await clinicWhatsapp();
  return <><WhatsAppBubble phone={p} /><AccountLayer clinicPhone={p} /></>;
}
