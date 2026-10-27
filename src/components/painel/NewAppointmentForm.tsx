"use client";

import { useState } from "react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { createAppointment } from "@/app/painel/actions";
import { brl, formatPhone, maskPhone, weekday } from "@/lib/format";
import { WEEKDAY_NAMES } from "@/lib/hours";
import { REPEAT_MAX, REPEAT_PRESETS } from "@/lib/repeat";
import type { ClientPackage, ServiceRow } from "@/lib/types";

type ClientOption = { id: string; name: string; phone: string | null };

export default function NewAppointmentForm({
  clients, services, packages, defaultClientId, defaultDate, defaultTime, isAdmin,
}: {
  clients: ClientOption[];
  services: ServiceRow[];
  packages: ClientPackage[];
  defaultClientId?: string;
  defaultDate: string;
  defaultTime?: string;
  /** Recorrência (repetir as sessões) só aparece para administradoras. */
  isAdmin: boolean;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [serviceId, setServiceId] = useState(services.find((s) => s.active)?.id ?? services[0]?.id ?? "");
  const [packageId, setPackageId] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [extras, setExtras] = useState<string[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatCount, setRepeatCount] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const clientPackages = packages.filter(
    (p) => p.client_id === clientId && Number(p.sessions_remaining) - Number(p.sessions_scheduled) > 0,
  );
  const selectedPkg = clientPackages.find((p) => p.id === packageId);
  const pkgLeft = selectedPkg ? Number(selectedPkg.sessions_remaining) - Number(selectedPkg.sessions_scheduled) : null;
  const days = repeatDays.length ? repeatDays : [weekday(date)];
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <ActionForm action={createAppointment} resetOnSuccess className="flex flex-col gap-4">
      <label>
        <span className="p-label">Cliente</span>
        <select
          name="client_id"
          required
          value={clientId}
          onChange={(e) => { setClientId(e.target.value); setPackageId(""); }}
          className="p-input"
        >
          <option value="" disabled>Selecione…</option>
          <option value="__novo">+ Novo cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${formatPhone(c.phone)}` : ""}</option>
          ))}
        </select>
      </label>

      {clientId === "__novo" && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#FDFAF5] border border-[#F0E6D6] p-3">
          <label>
            <span className="p-label">Nome</span>
            <input name="new_name" required minLength={2} className="p-input" autoComplete="off" />
          </label>
          <label>
            <span className="p-label">WhatsApp</span>
            <input name="new_phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(11) 99999-9999" className="p-input" />
          </label>
        </div>
      )}

      {clientPackages.length > 0 && (
        <fieldset className="rounded-xl bg-[#FFF9EE] border border-[#F0DFB8] p-3">
          <legend className="p-label px-1">Usar sessão de pacote?</legend>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="pkg_choice" checked={!packageId} onChange={() => setPackageId("")} className="accent-[#82590F]" />
              Não, cobrar avulso
            </label>
            {clientPackages.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pkg_choice"
                  checked={packageId === p.id}
                  onChange={() => { setPackageId(p.id); setServiceId(p.service_id); }}
                  className="accent-[#82590F]"
                />
                {p.name} · restam {Number(p.sessions_remaining) - Number(p.sessions_scheduled)} de {p.sessions_total}
              </label>
            ))}
          </div>
          <input type="hidden" name="client_package_id" value={packageId} />
        </fieldset>
      )}

      <label>
        <span className="p-label">Serviço</span>
        <select
          name="service_id"
          required
          value={serviceId}
          onChange={(e) => { setServiceId(e.target.value); if (selectedPkg && selectedPkg.service_id !== e.target.value) setPackageId(""); }}
          className="p-input"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inativo)"} · {s.duration_min} min · {brl(s.price)}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="p-label">Data</span>
          <input type="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className="p-input" />
        </label>
        <label>
          <span className="p-label">Horário</span>
          <input type="time" name="time" required step={300} defaultValue={defaultTime} className="p-input" />
        </label>
        <label>
          <span className="p-label">Duração (min)</span>
          <input key={`d-${serviceId}`} type="number" name="duration" min={15} max={480} step={5} defaultValue={service?.duration_min} className="p-input p-num" />
        </label>
        <label>
          <span className="p-label">Valor (R$)</span>
          <input
            key={`p-${serviceId}-${packageId}`}
            name="price"
            inputMode="decimal"
            disabled={Boolean(packageId)}
            defaultValue={packageId ? "Pacote" : service ? String(service.price).replace(".", ",") : ""}
            className="p-input p-num disabled:bg-[#F7F2EA]"
          />
        </label>
      </div>

      <details className="rounded-xl bg-[#FDFAF5] border border-[#F0E6D6] p-3" open={extras.length > 0 || undefined}>
        <summary className="p-label cursor-pointer">Procedimentos opcionais no mesmo horário{extras.length ? ` · ${extras.length}` : ""}</summary>
        <p className="text-xs text-[#857566] mt-1 mb-2">Para a mesma cliente fazer mais de um procedimento junto. Cada um entra na agenda com sua duração e valor.</p>
        <div className="grid sm:grid-cols-2 gap-1.5">
          {services.filter((s) => s.active && s.id !== serviceId).map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="extra_service_id" value={s.id} checked={extras.includes(s.id)} onChange={() => setExtras(toggle(extras, s.id))} className="accent-[#82590F]" />
              <span>{s.name} <span className="text-xs text-[#857566]">· {s.duration_min} min · {brl(s.price)}</span></span>
            </label>
          ))}
        </div>
      </details>

      {isAdmin && <div className="rounded-xl bg-[#FDFAF5] border border-[#F0E6D6] p-3">
        <label className="flex items-center gap-2 text-sm font-bold text-[#2B221B]">
          <input type="checkbox" name="repeat" checked={repeat} onChange={(e) => { setRepeat(e.target.checked); if (!repeatCount) setRepeatCount(String(pkgLeft ?? REPEAT_PRESETS[0])); }} className="accent-[#82590F]" />
          Repetir no mesmo horário (sessões do plano)
        </label>
        {repeat && (
          <div className="flex flex-col gap-3 mt-3">
            <div>
              <span className="p-label">Dias da semana · {days.length}x por semana</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_NAMES.map((n, i) => (
                  <label key={n} className="p-chip cursor-pointer" aria-current={days.includes(i)}>
                    <input type="checkbox" name="repeat_day" value={i} checked={days.includes(i)} onChange={() => setRepeatDays(toggle(days, i))} className="sr-only" />
                    {n.slice(0, 3)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="p-label">Total de sessões (contando esta){pkgLeft !== null ? ` · o pacote tem ${pkgLeft}` : ""}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {REPEAT_PRESETS.map((n) => (
                  <button key={n} type="button" onClick={() => setRepeatCount(String(n))} className="p-chip" aria-current={repeatCount === String(n)}>{n}</button>
                ))}
                <input type="number" name="repeat_count" min={1} max={pkgLeft ?? REPEAT_MAX} value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} className="p-input p-num w-24" aria-label="Total de sessões" />
              </div>
            </div>
            <p className="text-xs text-[#857566]">Dias fechados, bloqueados ou já ocupados por outra cliente são pulados; a lista segue até completar as sessões.</p>
          </div>
        )}
      </div>}

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="p-label">Situação</span>
          <select name="status" defaultValue="confirmado" className="p-input">
            <option value="confirmado">Confirmado</option>
            <option value="solicitado">A confirmar</option>
          </select>
        </label>
        <label>
          <span className="p-label">Observações</span>
          <input name="notes" className="p-input" placeholder="Opcional" />
        </label>
      </div>

      <div>
        <SubmitButton pendingText="Salvando…">Agendar</SubmitButton>
      </div>
    </ActionForm>
  );
}
