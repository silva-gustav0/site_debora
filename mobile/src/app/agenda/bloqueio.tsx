import { addDays, diffDays, todaySP } from "@shared/format";
import { toTimestamp } from "@shared/hours";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Lock } from "lucide-react-native";
import { Button, DateField, Field, Row, TimeField, Toggle, Txt, useToast } from "@/components/ui";
import { write } from "@/db/write";
import { DrawerScreen } from "@/lib/agenda";

/** Bloqueia um horário ou dias inteiros (até 60 dias) na agenda e no site. */
export default function BlockTime() {
  const p = useLocalSearchParams<{ date?: string }>();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [from, setFrom] = useState<string | null>(p.date ?? todaySP());
  const [to, setTo] = useState<string | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [allDay, setAllDay] = useState(false);

  const save = async () => {
    const last = to || from;
    if (!from || !last || last < from) return toast("Informe as datas do bloqueio.", "error");
    const [s, e] = allDay ? ["00:00", "23:59"] : [start, end];
    if (e <= s) return toast("O fim precisa ser depois do início.", "error");
    const rows = Array.from({ length: Math.min(60, diffDays(from, last) + 1) }, (_, i) => addDays(from, i))
      .map((d) => ({ starts_at: toTimestamp(d, s), ends_at: toTimestamp(d, e), reason: reason.trim().slice(0, 120) || "Bloqueado", created_at: new Date().toISOString() }));
    try {
      await write(async (w) => { for (const r of rows) await w.insert("time_blocks", r); });
    } catch {
      return toast("Não foi possível bloquear a agenda.", "error");
    }
    toast(rows.length > 1 ? `${rows.length} dias bloqueados.` : "Horário bloqueado.");
    router.back();
  };

  return (
    <DrawerScreen title="Bloquear agenda" eyebrow="Folga, curso, compromisso">
      <Field label="Motivo" value={reason} onChangeText={setReason} placeholder="Ex.: Curso, médico, folga" />
      <Row wrap gap={12}>
        <DateField label="De" value={from} onChange={setFrom} />
        <DateField label="Até" value={to ?? from} onChange={setTo} optional />
      </Row>
      <Toggle label="Dia inteiro" value={allDay} onChange={setAllDay} />
      {!allDay && (
        <Row wrap gap={12}>
          <TimeField label="Início" value={start} onChange={setStart} />
          <TimeField label="Fim" value={end} onChange={setEnd} />
        </Row>
      )}
      <Txt.muted style={{ fontSize: 12 }}>O site deixa de oferecer esses horários para agendamento.</Txt.muted>
      <Button icon={Lock} onPress={save} style={{ alignSelf: "flex-start" }}>Bloquear</Button>
    </DrawerScreen>
  );
}
