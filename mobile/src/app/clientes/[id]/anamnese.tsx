import { anamnesisFromAnswers } from "@shared/anamnesis";
import { allQuestions, type AnamnesisQuestion, type AnswerValue, formOrDefault, matchOption } from "@shared/anamnesis-schema";
import type { Anamnesis } from "@shared/types";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Button, Card, Chip, Empty, Field, Row, Screen, Segmented, Txt, useToast } from "@/components/ui";
import { asJson, useSettings } from "@/db/hooks";
import { write } from "@/db/write";
import { useClient } from "@/lib/clients";

type Answers = Record<string, AnswerValue>;

/** Uma pergunta da ficha conforme o tipo (escolha, várias, sim/não, texto). */
function Question({ q, value, onChange }: { q: AnamnesisQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const text = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];
  if (q.type === "text" || q.type === "long_text") {
    return <Field label={q.label} value={text} onChangeText={onChange} placeholder={q.placeholder} multiline={q.type === "long_text"} maxLength={q.type === "text" ? 300 : 1500} />;
  }
  return (
    <>
      <Txt.strong>{q.label}</Txt.strong>
      {q.type === "yes_no" ? (
        <Segmented value={value === true ? "sim" : value === false ? "nao" : ""} onChange={(v) => onChange(v === "sim" ? true : v === "nao" ? false : undefined)}
          options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }, { value: "", label: "—" }]} />
      ) : (
        <Row wrap gap={6}>
          {q.options?.map((o) => {
            const on = q.type === "multi" ? list.includes(o) : matchOption(q.options, value) === o;
            return <Chip key={o} label={o} on={on} onPress={() => onChange(q.type === "multi" ? (on ? list.filter((x) => x !== o) : [...list, o]) : on ? undefined : o)} />;
          })}
        </Row>
      )}
    </>
  );
}

/** Preenchimento/edição da ficha de anamnese pela equipe, conforme o modelo da clínica. */
export default function AnamneseCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useClient(id);
  const settings = useSettings();
  const toast = useToast();
  const form = formOrDefault(settings.anamnesis_form);
  const [answers, setAnswers] = useState<Answers | null>(null);
  if (!c) return <Screen title="Anamnese" back><Empty text="Cliente não encontrada." /></Screen>;
  const prev = asJson<Anamnesis | null>(c.anamnesis, null);
  const a = answers ?? Object.fromEntries(allQuestions(form).map((q) => {
    const v = (prev as Answers | null)?.[q.id];
    return [q.id, q.type === "choice" ? matchOption(q.options, v) || undefined : v];
  }));
  const save = async () => {
    const given = Object.fromEntries(Object.entries(a).map(([k, v]) => [k, typeof v === "string" ? v.trim() || undefined : v]));
    await write((w) => w.update("clients", id, anamnesisFromAnswers(given, "equipe", form, prev)));
    toast("Anamnese salva.");
    router.back();
  };
  return (
    <Screen title="Anamnese" subtitle={c.name} back>
      {form.sections.map((s) => (
        <Card key={s.id} title={s.title}>
          {s.questions.map((q) => <Question key={q.id} q={q} value={a[q.id]} onChange={(v) => setAnswers({ ...a, [q.id]: v })} />)}
        </Card>
      ))}
      <Button icon="checkmark" onPress={save}>Salvar anamnese</Button>
    </Screen>
  );
}
