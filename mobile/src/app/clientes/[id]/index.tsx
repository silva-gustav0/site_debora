import { diffDays, firstName, fmtDate, formatPhone, SOURCE_LABEL, STAGE_LABEL, todaySP } from "@shared/format";
import type { Anamnesis, ClientSource, ClientStage } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CalendarPlus, MessageCircle, Printer, ShieldAlert } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Avatar, Badge, Button, Card, Empty, Row, Screen, Tabs, useWide } from "@/components/ui";
import { Pacotes, Historico, Crm, Dados } from "@/components/client-relacao";
import { AnamneseTab, Evolucao, Fotos } from "@/components/client-prontuario";
import { Resumo } from "@/components/client-resumo";
import { Notice, useLandscape } from "@/components/client-ui";
import { Brand, Font } from "@/constants/brand";
import { asJson, asList, useSettings } from "@/db/hooks";
import { CLIENT_TABS, type ClientTab, openWa, STAGE_TONE, useClient } from "@/lib/clients";

const BODY = { resumo: Resumo, anamnese: AnamneseTab, evolucao: Evolucao, fotos: Fotos, pacotes: Pacotes, historico: Historico, crm: Crm, dados: Dados };

/** Volta para a lista de clientes (ou abre a lista se a ficha foi aberta direto). */
const backToList = () => (router.canGoBack() ? router.back() : router.replace("/clientes"));

/** Ficha da cliente no layout do painel: cabeçalho com avatar e ações, alertas e abas sublinhadas. */
export default function FichaCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  const settings = useSettings();
  const wide = useWide();
  const landscape = useLandscape();
  const [tab, setTab] = useState<ClientTab>("resumo");
  if (!c) return <Screen title="Cliente" back><Empty text="Cliente não encontrada." /></Screen>;
  const a = asJson<Partial<Anamnesis>>(c.anamnesis, {});
  const tags = asList(c.tags);
  const age = c.birth_date ? Math.floor(diffDays(c.birth_date, todaySP()) / 365.25) : null;
  const warnings = [
    a.pregnant && "Gestante", a.breastfeeding && "Amamentando", a.uses_acids && "Usa ácidos/retinoides", ...(a.conditions ?? []),
    (c.allergies || a.allergies_detail) && `Alergias: ${a.allergies_detail ?? c.allergies}`, c.health_notes,
  ].filter(Boolean) as string[];
  const info = [formatPhone(c.phone), c.email, age !== null && `${age} anos`, a.fitzpatrick && `Fototipo ${a.fitzpatrick}`,
    `Via ${SOURCE_LABEL[c.source as ClientSource] ?? c.source} · desde ${fmtDate(c.created_at, { month: "short" })}`].filter(Boolean) as string[];
  const Body = BODY[tab];
  const actions = (
    <Row wrap gap={8}>
      {!!c.phone && <Button variant="outline" icon={MessageCircle} onPress={() => openWa(c.phone, `Oi, ${firstName(c.name)}! Aqui é da ${settings.clinic_name} 🌸`)}>WhatsApp</Button>}
      <Button variant="outline" icon={Printer} onPress={() => setTab("anamnese")}>Ficha / termo</Button>
      <Button icon={CalendarPlus} onPress={() => router.push(`/agenda/novo?client_id=${c.id}`)}>Agendar</Button>
    </Row>
  );
  return (
    <Screen>
      <Pressable onPress={backToList} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}>
        <ArrowLeft size={14} color={Brand.muted} /><Text style={{ fontFamily: Font.body, fontSize: 14, color: Brand.muted }}>Clientes</Text>
      </Pressable>
      <Card gold bodyStyle={{ padding: wide ? 24 : 20, gap: 16 }}>
        <View style={{ flexDirection: landscape ? "row" : "column", alignItems: landscape ? "center" : "stretch", gap: 20 }}>
          <Row gap={16} style={{ flex: landscape ? 1 : undefined, alignItems: "center" }}>
            <Avatar name={c.name} size={wide ? 64 : 52} />
            <View style={{ flex: 1, gap: 6 }}>
              <Row wrap gap={8}>
                <Text style={{ fontFamily: Font.display, fontSize: wide ? 38 : 30, lineHeight: wide ? 42 : 34, color: Brand.ink }}>{c.name}</Text>
                <Badge tone={STAGE_TONE[c.stage as ClientStage] ?? "gray"}>{STAGE_LABEL[c.stage as ClientStage] ?? c.stage}</Badge>
                {c.consent_signed_at
                  ? <Badge tone="green">Termo assinado</Badge>
                  : <Badge tone="gold">Termo pendente</Badge>}
              </Row>
              <Row wrap gap={12}>{info.map((t) => <Text key={t} style={{ fontFamily: Font.body, fontSize: 14, color: Brand.muted }}>{t}</Text>)}</Row>
              {tags.length > 0 && <Row wrap gap={4}>{tags.map((t) => <Badge key={t} tone="bronze">{t}</Badge>)}</Row>}
            </View>
          </Row>
          {actions}
        </View>
        {warnings.length > 0 && <Notice tone="red" icon={ShieldAlert}><Text style={{ fontFamily: Font.bold }}>Atenção:</Text> {warnings.join(" · ")}</Notice>}
      </Card>
      <Tabs value={tab} options={[...CLIENT_TABS]} onChange={setTab} />
      <Body c={c} go={setTab} />
    </Screen>
  );
}
