import { useQuery } from "@powersync/react-native";
import { digits } from "@shared/format";
import { toMinutes, WEEKDAY_NAMES } from "@shared/hours";
import { type AnamnesisFormDef, type AnamnesisQuestion, consentOrDefault, DEFAULT_CONSENT, formOrDefault, QUESTION_TYPES, sanitizeForm } from "@shared/anamnesis-schema";
import type { BusinessHours, DayHours, Settings, TemplateKey } from "@shared/types";
import { useState } from "react";
import { Button, Card, ConfirmButton, Field, Row, Screen, Segmented, Select, TimeField, Toggle, Txt, useToast } from "@/components/ui";
import { useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { TEMPLATE_INFO } from "@/lib/reports";

const DAYS = [1, 2, 3, 4, 5, 6, 0] as const;
const patchSettings = (patch: Record<string, unknown>) => write((w) => w.update("settings", "1", { ...patch, updated_at: new Date().toISOString() }));
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const newId = () => `p${Date.now().toString(36)}`;
const num = (v: string) => Number(v.replace(",", ".")) || 0;

/** Aba Clínica e agenda: dados, regras do agendamento online, taxas e horário de funcionamento. */
function ClinicTab({ s }: { s: Settings }) {
  const toast = useToast();
  const [f, setF] = useState({
    clinic_name: s.clinic_name, whatsapp: s.whatsapp, address: s.address, slot_step_min: String(s.slot_step_min), min_lead_min: String(s.min_lead_min),
    max_days_ahead: String(s.max_days_ahead), cancel_min_hours: String(s.cancel_min_hours), fee_credit: String(s.fee_credit).replace(".", ","), fee_debit: String(s.fee_debit).replace(".", ","),
  });
  const [hours, setHours] = useState<BusinessHours>(s.business_hours);
  const text = (k: keyof typeof f, label: string, extra = {}) => <Field label={label} value={f[k]} onChangeText={(v) => setF({ ...f, [k]: v })} {...extra} />;
  const setDay = (d: number, h: DayHours) => setHours({ ...hours, [String(d)]: h });

  const save = async () => {
    for (const h of Object.values(hours)) if (h && toMinutes(h.close) <= toMinutes(h.open)) return toast("Confira os horários de abertura e fechamento.", "error");
    const step = Number(f.slot_step_min);
    await patchSettings({
      clinic_name: f.clinic_name.trim().slice(0, 120) || "Clínica Débora Silva", whatsapp: digits(f.whatsapp).slice(0, 20), address: f.address.trim().slice(0, 200),
      business_hours: hours, slot_step_min: [15, 20, 30, 60].includes(step) ? step : 30, min_lead_min: Math.max(Math.round(num(f.min_lead_min)), 0),
      max_days_ahead: clamp(Math.round(num(f.max_days_ahead)) || 90, 1, 365), cancel_min_hours: Math.max(Math.round(num(f.cancel_min_hours)), 0),
      fee_credit: clamp(num(f.fee_credit), 0, 30), fee_debit: clamp(num(f.fee_debit), 0, 30),
    });
    toast("Configurações salvas.");
  };

  return (
    <>
      <Card title="Dados da clínica">
        {text("clinic_name", "Nome")}
        {text("whatsapp", "WhatsApp (com DDI e DDD)", { keyboardType: "phone-pad", placeholder: "5511999999999" })}
        {text("address", "Endereço")}
      </Card>
      <Card title="Regras do agendamento online">
        <Select label="Intervalo entre horários" value={f.slot_step_min} onChange={(v) => setF({ ...f, slot_step_min: v })} options={["15", "20", "30", "60"].map((v) => ({ value: v, label: `${v} min` }))} />
        {text("min_lead_min", "Antecedência mínima (min)", { keyboardType: "number-pad" })}
        {text("max_days_ahead", "Agendar até (dias à frente)", { keyboardType: "number-pad" })}
        {text("cancel_min_hours", "Cancelar pelo site até (horas antes)", { keyboardType: "number-pad" })}
        {text("fee_credit", "Taxa crédito (%)", { keyboardType: "decimal-pad" })}
        {text("fee_debit", "Taxa débito (%)", { keyboardType: "decimal-pad" })}
      </Card>
      <Card title="Horário de funcionamento">
        {DAYS.map((d) => {
          const h = hours[String(d) as "0"];
          return (
            <Card key={d} title={WEEKDAY_NAMES[d]} right={<Toggle label="Aberto" value={!!h} onChange={(on) => setDay(d, on ? { open: "09:00", close: "18:00", break_start: null, break_end: null } : null)} />}>
              {h && (
                <>
                  <Row><TimeField label="Abre" value={h.open} onChange={(open) => setDay(d, { ...h, open })} /><TimeField label="Fecha" value={h.close} onChange={(close) => setDay(d, { ...h, close })} /></Row>
                  <Toggle label="Intervalo" value={!!h.break_start} onChange={(on) => setDay(d, { ...h, break_start: on ? "12:00" : null, break_end: on ? "13:00" : null })} />
                  {h.break_start && h.break_end && <Row><TimeField label="Intervalo de" value={h.break_start} onChange={(break_start) => setDay(d, { ...h, break_start })} /><TimeField label="até" value={h.break_end} onChange={(break_end) => setDay(d, { ...h, break_end })} /></Row>}
                </>
              )}
            </Card>
          );
        })}
        <Txt.muted>Os horários valem para o site e para a grade da agenda. Para folgas pontuais, use “Bloquear” na agenda.</Txt.muted>
      </Card>
      <Button onPress={save}>Salvar configurações</Button>
    </>
  );
}

/** Aba Mensagens: modelos de WhatsApp usados nos envios. */
function MessagesTab({ s }: { s: Settings }) {
  const toast = useToast();
  const [t, setT] = useState(s.templates);
  return (
    <>
      <Txt.muted>Variáveis: {"{nome} {servico} {data} {hora} {clinica} {link}"} (link do agendamento da cliente).</Txt.muted>
      {(Object.keys(TEMPLATE_INFO) as TemplateKey[]).map((k) => (
        <Card key={k} title={TEMPLATE_INFO[k].title} eyebrow={TEMPLATE_INFO[k].when}>
          <Field label={TEMPLATE_INFO[k].title} multiline value={t[k]} onChangeText={(v) => setT({ ...t, [k]: v })} />
        </Card>
      ))}
      <Button onPress={async () => {
        await patchSettings({ templates: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.trim().slice(0, 1000)]).filter(([, v]) => v)) });
        toast("Mensagens salvas.");
      }}>Salvar mensagens</Button>
    </>
  );
}

/** Aba Anamnese e termo: edita seções, perguntas (rótulo, tipo, opções, alerta) e o texto do termo. */
function AnamnesisTab({ s }: { s: Settings }) {
  const toast = useToast();
  const [form, setForm] = useState<AnamnesisFormDef>(() => formOrDefault(s.anamnesis_form));
  const [consent, setConsent] = useState(() => consentOrDefault(s.consent_text));
  const change = (si: number, fn: (qs: AnamnesisQuestion[]) => AnamnesisQuestion[]) =>
    setForm({ sections: form.sections.map((sec, i) => (i === si ? { ...sec, questions: fn(sec.questions) } : sec)) });
  const setQ = (si: number, qi: number, p: Partial<AnamnesisQuestion>) => change(si, (qs) => qs.map((q, i) => (i === qi ? { ...q, ...p } : q)));

  const save = async () => {
    const clean = sanitizeForm(form);
    if (!clean) return toast("A ficha precisa de pelo menos uma pergunta com nome (e opções, quando for de escolha).", "error");
    await patchSettings({ anamnesis_form: clean, consent_text: consent.trim() && consent.trim() !== DEFAULT_CONSENT ? consent.trim().slice(0, 8000) : null });
    toast("Ficha e termo salvos. As próximas fichas já usam este modelo.");
  };

  return (
    <>
      {form.sections.map((sec, si) => (
        <Card key={sec.id} title={sec.title} right={<ConfirmButton onConfirm={() => setForm({ sections: form.sections.filter((_, i) => i !== si) })}>Remover seção</ConfirmButton>}>
          <Field label="Título da seção" value={sec.title} onChangeText={(title) => setForm({ sections: form.sections.map((x, i) => (i === si ? { ...x, title } : x)) })} />
          {sec.questions.map((q, qi) => (
            <Card key={q.id}>
              <Field label="Pergunta" value={q.label} onChangeText={(label) => setQ(si, qi, { label })} />
              <Select label="Tipo" value={q.type} onChange={(type) => setQ(si, qi, { type, options: type === "choice" || type === "multi" ? q.options ?? ["Opção 1"] : undefined })} options={QUESTION_TYPES.map((t) => ({ value: t.v, label: t.l }))} />
              {(q.type === "choice" || q.type === "multi") && <Field label="Opções (uma por linha)" multiline value={(q.options ?? []).join("\n")} onChangeText={(v) => setQ(si, qi, { options: v.split("\n") })} />}
              <Toggle label="Entra no alerta de saúde" value={!!q.alert} onChange={(alert) => setQ(si, qi, { alert })} />
              <ConfirmButton onConfirm={() => change(si, (qs) => qs.filter((_, i) => i !== qi))}>Remover pergunta</ConfirmButton>
            </Card>
          ))}
          <Button variant="outline" icon="add" onPress={() => change(si, (qs) => [...qs, { id: newId(), label: "", type: "text" }])}>Adicionar pergunta</Button>
        </Card>
      ))}
      <Button variant="outline" icon="add" onPress={() => setForm({ sections: [...form.sections, { id: newId(), title: "Nova seção", questions: [] }] })}>Adicionar seção</Button>
      <Card title="Termo de consentimento" eyebrow="Use {clinica} e {nome}"><Field label="Texto do termo" multiline value={consent} onChangeText={setConsent} style={{ minHeight: 220 } as never} /></Card>
      <Button onPress={save}>Salvar ficha e termo</Button>
      <ConfirmButton small={false} confirmText="Voltar ao padrão" onConfirm={async () => {
        await patchSettings({ anamnesis_form: null, consent_text: null });
        setForm(formOrDefault(null)); setConsent(DEFAULT_CONSENT);
        toast("Ficha e termo voltaram ao modelo original.");
      }}>Voltar ao modelo original</ConfirmButton>
    </>
  );
}

/** Configurações da clínica: dados e agenda, mensagens de WhatsApp e ficha de anamnese com termo. */
export default function Configuracoes() {
  const settings = useSettings();
  const { isLoading } = useQuery("select id from settings limit 1");
  const [tab, setTab] = useState<"clinica" | "mensagens" | "anamnese">("clinica");
  return (
    <Screen title="Configurações" back>
      <Segmented value={tab} onChange={setTab} options={[{ value: "clinica", label: "Clínica" }, { value: "mensagens", label: "Mensagens" }, { value: "anamnese", label: "Anamnese" }]} />
      {!isLoading && (tab === "clinica" ? <ClinicTab s={settings} /> : tab === "mensagens" ? <MessagesTab s={settings} /> : <AnamnesisTab s={settings} />)}
    </Screen>
  );
}
