"use client";

import { useState, type ReactNode } from "react";
import SubmitButton from "./SubmitButton";

/** Botão de envio em dois cliques, para ações destrutivas (sem diálogos do navegador). */
export default function ConfirmButton({ children, confirmText = "Confirmar exclusão" }: { children: ReactNode; confirmText?: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="p-btn-ghost p-btn-sm p-btn-danger" onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex gap-1.5">
      <SubmitButton className="p-btn p-btn-sm" style={{ background: "#9B2C2C", borderColor: "#9B2C2C" }}>
        {confirmText}
      </SubmitButton>
      <button type="button" className="p-btn-ghost p-btn-sm" onClick={() => setArmed(false)}>Cancelar</button>
    </span>
  );
}
