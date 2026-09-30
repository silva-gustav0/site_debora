import { todaySP, whatsappLink } from "@shared/format";
import { suggestionsFor } from "@shared/whatsapp-messages";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { Button, Field, Sheet, useToast } from "@/components/ui";
import { Brand, Font } from "@/constants/brand";
import { useSettings } from "@/db/hooks";
import { logContact } from "@/lib/reports";

export type WaTarget = { id: string; name: string; phone: string | null; birth_date?: string | null };

/** Gaveta do WhatsApp de uma cliente: sugestões de mensagem com o primeiro nome, editáveis; abrir registra no histórico. */
export function WhatsAppSheet({ client, onClose }: { client: WaTarget | null; onClose: () => void }) {
  const settings = useSettings();
  const toast = useToast();
  const options = client ? suggestionsFor(client, settings, todaySP().slice(5, 7)) : [];
  const [pick, setPick] = useState<{ id: string; i: number; text: string } | null>(null);
  // Troca de cliente volta para a primeira sugestão.
  const current = pick && pick.id === client?.id ? pick : client ? { id: client.id, i: 0, text: options[0]?.text ?? "" } : null;

  const send = async () => {
    if (!client || !current) return;
    const url = whatsappLink(client.phone, current.text);
    if (!url) return toast("Esta cliente não tem WhatsApp cadastrado.", "error");
    await Linking.openURL(url);
    await logContact(client.id, `WhatsApp: ${current.text}`);
    onClose();
  };

  return (
    <Sheet visible={!!client} onClose={onClose} title={client ? `WhatsApp · ${client.name}` : ""}>
      <Text style={s.hint}>Escolha uma sugestão, ajuste se quiser e toque em abrir. O envio fica registrado no histórico da cliente.</Text>
      {options.map((o, i) => (
        <Pressable key={o.title} onPress={() => client && setPick({ id: client.id, i, text: o.text })} style={[s.option, current?.i === i && s.on]}>
          <Text style={s.title}>{o.title.toUpperCase()}</Text>
          <Text style={s.text} numberOfLines={3}>{o.text}</Text>
        </Pressable>
      ))}
      {current && (
        <Field label="Mensagem" multiline value={current.text} onChangeText={(text) => client && setPick({ id: client.id, i: current.i, text })} />
      )}
      <Button icon="logo-whatsapp" onPress={send}>Abrir no WhatsApp</Button>
    </Sheet>
  );
}

const s = StyleSheet.create({
  hint: { fontFamily: Font.body, fontSize: 13, color: Brand.muted },
  option: { borderWidth: 1, borderColor: Brand.line, borderRadius: 12, padding: 12, gap: 4, backgroundColor: Brand.white },
  on: { borderColor: Brand.gold, backgroundColor: "#FFF9EC" },
  title: { fontFamily: Font.bold, fontSize: 10, letterSpacing: 1.6, color: Brand.eyebrow },
  text: { fontFamily: Font.body, fontSize: 14, color: Brand.ink, lineHeight: 20 },
});
