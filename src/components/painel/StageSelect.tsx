"use client";

import { useRef } from "react";
import { setClientStage } from "@/app/painel/actions";
import { STAGE_LABEL } from "@/lib/format";
import type { ClientStage } from "@/lib/types";

/** Muda a etapa do funil assim que a opção é escolhida. */
export default function StageSelect({ id, stage, name }: { id: string; stage: ClientStage; name: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={setClientStage}>
      <input type="hidden" name="id" value={id} />
      <select
        name="stage"
        defaultValue={stage}
        onChange={() => ref.current?.requestSubmit()}
        aria-label={`Mover ${name} para`}
        className="p-input py-1 text-xs"
      >
        {Object.entries(STAGE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </form>
  );
}
