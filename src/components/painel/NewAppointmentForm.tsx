"use client";

import { useState } from "react";
import ActionForm from "./ActionForm";
import SubmitButton from "./SubmitButton";
import { createAppointment } from "@/app/painel/actions";
import { brl, formatPhone, maskPhone } from "@/lib/format";
import type { ClientPackage, ServiceRow } from "@/lib/types";

type ClientOption = { id: string; name: string; phone: string | null };

export default function NewAppointmentForm({
  clients, services, packages, defaultClientId, defaultDate, defaultTime,
}: {
  clients: ClientOption[];
  services: ServiceRow[];
  packages: ClientPackage[];
  defaultClientId?: string;
  defaultDate: string;
  defaultTime?: string;
}) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [serviceId, setServiceId] = useState(services.find((s) => s.active)?.id ?? services[0]?.id ?? "");
  const [packageId, setPackageId] = useState("");
  const [phone, setPhone] = useState("");
  const service = services.find((s) => s.id === serviceId);
  const clientPackages = packages.filter(
    (p) => p.client_id === clientId && Number(p.sessions_remaining) - Number(p.sessions_scheduled) > 0,
  );
  const selectedPkg = clientPackages.find((p) => p.id === packageId);

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
          <option value="__novo">+ Nova cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${formatPhone(c.phone)}` : ""}</option>
          ))}
        </select>
      </label>

      {clientId === "__novo" && (
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#FFF8F6] border border-[#F3E2DE] p-3">
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
              <input type="radio" name="pkg_choice" checked={!packageId} onChange={() => setPackageId("")} className="accent-[#A85B63]" />
              Não, cobrar avulso
            </label>
            {clientPackages.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="pkg_choice"
                  checked={packageId === p.id}
                  onChange={() => { setPackageId(p.id); setServiceId(p.service_id); }}
                  className="accent-[#A85B63]"
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
          <input type="date" name="date" required defaultValue={defaultDate} className="p-input" />
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
            className="p-input p-num disabled:bg-[#F7F1EF]"
          />
        </label>
      </div>

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
