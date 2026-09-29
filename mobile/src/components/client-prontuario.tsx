import { useQuery, useStatus } from "@powersync/react-native";
import { consentOrDefault, FITZPATRICK, fillConsent } from "@shared/anamnesis-schema";
import { fmtDate, fmtTime, todaySP } from "@shared/format";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Check, ClipboardList, CloudUpload, Images } from "lucide-react-native";
import { type ReactNode, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, ConfirmButton, DateField, Empty, Field, Row, Segmented, Select, TONES, useToast, useWide } from "@/components/ui";
import { AnamnesisForm } from "@/components/client-anamnesis";
import { Cols, cs, T, Timeline, TimelineItem, useLandscape } from "@/components/client-ui";
import { Brand, Font } from "@/constants/brand";
import { asJson, useMe, useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { type Appt, APPTS, clean, nowIso, type TabProps, toOptions, useForm } from "@/lib/clients";
import { deletePhoto, discardQueued, pickPhotos, syncPhotos, useSignedUrls } from "@/lib/photo-sync";

const PHOTO_KINDS = { antes: "Antes", depois: "Depois", evolucao: "Evolução" };

/** Anamnese editável na própria aba, com termo de consentimento e guia de fototipos ao lado. */
export function AnamneseTab({ c }: TabProps) {
  const settings = useSettings();
  const [showTerm, setShowTerm] = useState(false);
  const a = asJson<Record<string, unknown>>(c.anamnesis, {});
  const filledAt = typeof a.filled_at === "string" ? a.filled_at : null;
  const consent = fillConsent(consentOrDefault(settings.consent_text), { clinica: settings.clinic_name, nome: c.name });
  const toggleConsent = () => write((w) => w.update("clients", c.id, { consent_signed_at: c.consent_signed_at ? null : nowIso() }));
  return (
    <Cols aside={320}>
      <Card title="Ficha de anamnese" eyebrow={filledAt ? `Preenchida pel${a.filled_by === "cliente" ? "o cliente (link)" : "a equipe"} em ${fmtDate(filledAt)} ${fmtTime(filledAt)}` : "Avaliação"}>
        <AnamnesisForm key={c.id} c={c} />
      </Card>
      <>
        <Card title="Termo de consentimento">
          {c.consent_signed_at
            ? <T style={{ color: TONES.green.fg }}>Assinado em {fmtDate(c.consent_signed_at)}.</T>
            : <T style={cs.small}>Leia o termo com a cliente, colete a assinatura e marque como assinado.</T>}
          {showTerm && consent.split(/\n\s*\n/).map((p, i) => <T key={i} style={{ fontSize: 13 }}>{p}</T>)}
          <Row wrap>
            <Button small variant="outline" onPress={() => setShowTerm(!showTerm)}>{showTerm ? "Ocultar termo" : "Ver termo"}</Button>
            <Button small variant={c.consent_signed_at ? "outline" : "primary"} icon={c.consent_signed_at ? undefined : Check} onPress={toggleConsent}>
              {c.consent_signed_at ? "Desmarcar" : "Marcar como assinado"}
            </Button>
          </Row>
        </Card>
        <Card title="Guia de fototipos" bodyStyle={{ gap: 4 }}>
          {FITZPATRICK.map((f) => <Text key={f} style={[cs.small, { color: Brand.body }]}>{f}</Text>)}
        </Card>
      </>
    </Cols>
  );
}

type Rec = { id: string; record_date: string; procedure: string; products_used: string | null; parameters: string | null; observations: string | null; next_steps: string | null };

/** Campo da linha do tempo (rótulo em versalete e texto). */
const Detail = ({ label, v, full }: { label: string; v: string | null; full?: boolean }) => !v ? null : (
  <View style={full ? { width: "100%" } : { flexBasis: 220, flexGrow: 1 }}><Text style={cs.label}>{label.toUpperCase()}</Text><T>{v}</T></View>
);

/** Prontuário: formulário de nova evolução e linha do tempo do tratamento. */
export function Evolucao({ c }: TabProps) {
  const toast = useToast();
  const me = useMe();
  const { f, set, reset } = useForm({ record_date: todaySP() as string | null, appointment_id: "", procedure: "", products_used: "", parameters: "", observations: "", next_steps: "" });
  const { data: done } = useQuery<Appt>(`${APPTS} and a.status = 'concluido' order by a.starts_at desc limit 20`, [c.id]);
  const { data: services } = useQuery<{ name: string }>("select name from services where active = 1 order by sort_order, name");
  const { data: recs } = useQuery<Rec>("select * from session_records where client_id = ? order by record_date desc, created_at desc", [c.id]);
  const add = async () => {
    if (!f.procedure.trim()) return toast("Informe o procedimento realizado.", "error");
    await write((w) => w.insert("session_records", clean({ ...f, record_date: f.record_date ?? todaySP(), client_id: c.id, created_by: me?.id, created_at: nowIso() })));
    reset();
    toast("Evolução registrada no prontuário.");
  };
  return (
    <Cols side={380}>
      <Card title="Nova evolução" eyebrow="Prontuário">
        <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
          <DateField label="Data" value={f.record_date} onChange={set("record_date")} />
          <Select label="Atendimento" value={f.appointment_id} onChange={set("appointment_id")}
            options={[{ value: "", label: "—" }, ...done.map((a) => ({ value: a.id, label: `${fmtDate(a.starts_at, { year: "2-digit" })} · ${a.service ?? "—"}` }))]} />
        </Row>
        <Field label="Procedimento *" value={f.procedure} onChangeText={set("procedure")} />
        <Row wrap gap={6}>{services.slice(0, 10).map((s) => <Chip key={s.name} label={s.name} on={f.procedure === s.name} onPress={() => set("procedure")(s.name)} />)}</Row>
        <Field label="Produtos / ativos utilizados" value={f.products_used} onChangeText={set("products_used")} multiline />
        <Field label="Parâmetros (tempo, intensidade, concentração)" value={f.parameters} onChangeText={set("parameters")} />
        <Field label="Observações e reação da pele" value={f.observations} onChangeText={set("observations")} multiline />
        <Field label="Orientações / próximos passos" value={f.next_steps} onChangeText={set("next_steps")} multiline />
        <Button style={{ alignSelf: "flex-start" }} onPress={add}>Registrar evolução</Button>
      </Card>
      <Card title="Linha do tempo do tratamento" eyebrow={`${recs.length} registros`}>
        {recs.length === 0 ? <Empty icon={ClipboardList} text="Nenhuma evolução ainda. Registre ao concluir cada sessão." /> : (
          <Timeline>
            {recs.map((r) => (
              <TimelineItem key={r.id}>
                <Row wrap gap={8}><Text style={cs.display}>{r.procedure}</Text><Text style={cs.small}>{fmtDate(r.record_date)}</Text></Row>
                <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, rowGap: 8, marginTop: 4 }}>
                  <Detail label="Produtos" v={r.products_used} />
                  <Detail label="Parâmetros" v={r.parameters} />
                  <Detail label="Observações" v={r.observations} full />
                  <Detail label="Próximos passos" v={r.next_steps} full />
                </View>
                <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  <ConfirmButton confirmText="Excluir registro" onConfirm={() => write((w) => w.remove("session_records", r.id))} />
                </View>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </Card>
    </Cols>
  );
}

type Photo = { id: string; path: string; kind: keyof typeof PHOTO_KINDS; taken_on: string; caption: string | null };
type Queued = Photo & { local_uri: string; error: string | null };

/** Foto 3:4 com legenda sobre degradê escuro e ação no canto, como no painel. */
function PhotoTile({ p, uri, width, action }: { p: Photo; uri?: string; width: `${number}%`; action: ReactNode }) {
  return (
    <View style={{ width, gap: 4 }}>
      <View style={{ aspectRatio: 3 / 4, borderRadius: 12, overflow: "hidden", backgroundColor: Brand.lineSoft }}>
        <Image source={uri ? { uri, cacheKey: p.path ?? p.id } : undefined} style={{ flex: 1 }} contentFit="cover" />
        <LinearGradient colors={["transparent", "rgba(41,32,26,0.8)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, paddingTop: 20 }}>
          <Text style={{ color: Brand.white, fontSize: 11, fontFamily: Font.body }} numberOfLines={2}>
            <Text style={{ fontFamily: Font.bold, letterSpacing: 1 }}>{(PHOTO_KINDS[p.kind] ?? p.kind).toUpperCase()}</Text> · {fmtDate(p.taken_on, { year: "2-digit" })}{p.caption ? `\n${p.caption}` : ""}
          </Text>
        </LinearGradient>
      </View>
      {action}
    </View>
  );
}

/** Fotos de antes/depois: envio (fila offline) ao lado da galeria (URL assinada, on-line). */
export function Fotos({ c }: TabProps) {
  const toast = useToast();
  const wide = useWide();
  const landscape = useLandscape();
  const { connected } = useStatus();
  const { f, set } = useForm({ kind: "antes" as keyof typeof PHOTO_KINDS, taken_on: todaySP() as string | null, caption: "" });
  const { data: queue } = useQuery<Queued>("select * from photo_uploads where client_id = ? order by created_at", [c.id]);
  const { data: photos } = useQuery<Photo>("select * from client_photos where client_id = ? order by taken_on desc, created_at desc", [c.id]);
  const urls = useSignedUrls(connected ? photos.map((p) => p.path) : []);
  const width = landscape ? "23%" : wide ? "31.5%" : "48%";
  useEffect(() => { syncPhotos().catch(() => {}); }, []);
  const add = async (camera: boolean) => {
    try {
      const n = await pickPhotos(camera, c.id, { ...f, taken_on: f.taken_on ?? todaySP() });
      if (!n) return;
      const sent = await syncPhotos().catch(() => 0);
      toast(sent >= n ? (n > 1 ? `${n} fotos enviadas.` : "Foto enviada.") : "Foto salva no aparelho. Será enviada quando houver internet.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não foi possível enviar a foto.", "error");
    }
  };
  const remove = (p: Photo) => deletePhoto(p.id, p.path).catch(() => toast("Não foi possível excluir a foto.", "error"));
  return (
    <Cols side={340}>
      <View style={{ gap: 12 }}>
        <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: "#E6D8BC", backgroundColor: "#FEFBF7", borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={[cs.box, { alignItems: "center", gap: 8, paddingVertical: 20 }]}>
            <Camera size={22} color={Brand.gold} />
            <T style={{ color: Brand.body }}>Tire ou escolha fotos</T>
            <Text style={[cs.small, { fontSize: 11, color: "#A69885" }]}>Até 6 por vez · comprimidas automaticamente</Text>
            <Row wrap style={{ justifyContent: "center" }}>
              <Button small icon={Camera} onPress={() => add(true)}>Tirar foto</Button>
              <Button small variant="outline" icon={Images} onPress={() => add(false)}>Galeria</Button>
            </Row>
          </View>
          <Segmented value={f.kind} options={toOptions(PHOTO_KINDS)} onChange={set("kind")} />
          <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
            <DateField label="Data" value={f.taken_on} onChange={set("taken_on")} />
            <Field label="Legenda (opcional)" value={f.caption} onChangeText={set("caption")} />
          </Row>
        </View>
        <Text style={[cs.small, { paddingHorizontal: 4 }]}>As fotos ficam em armazenamento privado e só aparecem para a equipe logada. Peça autorização da cliente antes de usar em divulgação.</Text>
      </View>
      <Card title="Antes e depois" eyebrow={`${photos.length} fotos`}>
        {queue.length > 0 && (
          <>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={cs.label}>AGUARDANDO ENVIO · {queue.length}</Text>
              {connected && <Button small variant="ghost" icon={CloudUpload} onPress={() => syncPhotos().catch(() => 0)}>Enviar agora</Button>}
            </Row>
            <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
              {queue.map((q) => (
                <PhotoTile key={q.id} p={q} uri={q.local_uri} width={width} action={<>
                  {!!q.error && <Text style={[cs.small, { color: TONES.red.fg }]}>{q.error}</Text>}
                  <ConfirmButton confirmText="Descartar" onConfirm={() => discardQueued(q.id, q.local_uri)}>Descartar</ConfirmButton>
                </>} />
              ))}
            </Row>
          </>
        )}
        {!connected && photos.length > 0 && <Text style={cs.small}>Sem internet: as fotos já enviadas aparecem quando o aparelho estiver on-line.</Text>}
        {photos.length === 0 && queue.length === 0 ? <Empty icon={Images} text="Nenhuma foto ainda." /> : (
          <Row wrap gap={10} style={{ alignItems: "flex-start" }}>
            {photos.map((p) => (
              <PhotoTile key={p.id} p={p} uri={urls[p.path]} width={width} action={connected && <ConfirmButton confirmText="Excluir" onConfirm={() => remove(p)} />} />
            ))}
          </Row>
        )}
      </Card>
    </Cols>
  );
}
