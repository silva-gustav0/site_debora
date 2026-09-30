import { anamnesisFromAnswers } from "@shared/anamnesis";
import { allQuestions, type AnamnesisQuestion, type AnswerValue, formOrDefault, matchOption } from "@shared/anamnesis-schema";
import type { Anamnesis } from "@shared/types";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Chip, Field, Select, useToast } from "@/components/ui";
import { cs, T } from "@/components/client-ui";
import { Brand, Font } from "@/constants/brand";
import { asJson, useSettings } from "@/db/hooks";
import { save, write } from "@/db/write";
import type { ClientDb } from "@/lib/clients";

type Answers = Record<string, AnswerValue>;

/** Uma pergunta da ficha conforme o tipo, no visual do AnamnesisForm do painel. */
function Question({ q, value, onChange }: { q: AnamnesisQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  if (q.type === "text" || q.type === "long_text") {
    return <Field label={q.label} value={text} onChangeText={onChange} placeholder={q.placeholder} multiline={q.type === "long_text"} maxLength={q.type === "text" ? 300 : 1500} />;
  }
  if (q.type === "choice") {
    return <Select label={q.label} value={matchOption(q.options, value) ?? ""} onChange={(v) => onChange(v || undefined)}
      options={[{ value: "", label: "—" }, ...(q.options ?? []).map((o) => ({ value: o, label: o }))]} />;
  }
  if (q.type === "yes_no") {
    return (
      <View style={[cs.box, { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8 }]}>
        <T style={{ flex: 1 }}>{q.label}</T>
        <Chip label="Sim" on={value === true} onPress={() => onChange(value === true ? undefined : true)} />
        <Chip label="Não" on={value === false} onPress={() => onChange(value === false ? undefined : false)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={[cs.label, { fontFamily: Font.body, color: Brand.label }]}>{q.label.toUpperCase()}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {q.options?.map((o) => {
          const on = list.includes(o);
          return <Chip key={o} label={o} on={on} onPress={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])} />;
        })}
      </View>
    </View>
  );
}

/** Ficha de anamnese preenchida pela equipe, conforme o modelo da clínica (seções com grade de duas colunas). */
export function AnamnesisForm({ c, onSaved }: { c: ClientDb; onSaved?: () => void }) {
  const settings = useSettings();
  const toast = useToast();
  const form = formOrDefault(settings.anamnesis_form);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const prev = asJson<Anamnesis | null>(c.anamnesis, null);
  const a = answers ?? Object.fromEntries(allQuestions(form).map((q) => {
    const v = (prev as Answers | null)?.[q.id];
    return [q.id, q.type === "choice" ? matchOption(q.options, v) || undefined : v];
  }));
  const submit = async () => {
    const given = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === "string" ? v.trim() || undefined : v]));
    if (!await save(toast, write((w) => w.update("clients", c.id, anamnesisFromAnswers(given, "equipe", form, prev))))) return;
    toast("Anamnese salva.");
    onSaved?.();
  };
  return (
    <View style={{ gap: 26 }}>
      {form.sections.map((s) => (
        <View key={s.id} style={{ gap: 12 }}>
          <Text style={[cs.display, { fontSize: 20, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#F0E8DB" }]}>{s.title}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {s.questions.map((q) => (
              <View key={q.id} style={q.type === "multi" || q.type === "long_text" ? { width: "100%" } : { flexBasis: 260, flexGrow: 1, minWidth: 0 }}>
                <Question q={q} value={a[q.id]} onChange={(v) => setAnswers({ ...a, [q.id]: v })} />
              </View>
            ))}
          </View>
        </View>
      ))}
      <Button icon={Check} style={{ alignSelf: "flex-start" }} onPress={submit}>Salvar anamnese</Button>
    </View>
  );
}
