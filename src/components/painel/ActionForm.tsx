"use client";

import { createContext, startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/lib/types";

/** Estado "enviando" do ActionForm mais próximo (lido pelo SubmitButton). */
export const ActionPendingContext = createContext<boolean | null>(null);

/**
 * <form> ligado a uma server action (prev, formData) => ActionState, exibindo a mensagem de retorno.
 * Envia via onSubmit (sem o reset automático do React), para não apagar o que foi digitado
 * quando a validação falha. `resetOnSuccess` limpa os campos só quando dá certo.
 */
export default function ActionForm({
  action, children, className = "", resetOnSuccess = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  return (
    <ActionPendingContext.Provider value={pending}>
      <form ref={ref} onSubmit={onSubmit} className={className}>
        {children}
        {state && !pending && (
          <p
            role={state.ok ? "status" : "alert"}
            className="text-sm rounded-lg px-3 py-2 mt-3"
            style={state.ok ? { background: "#EAF6EE", color: "#1F6B3A" } : { background: "#FFF1F1", color: "#9B2C2C" }}
          >
            {state.message}
          </p>
        )}
      </form>
    </ActionPendingContext.Provider>
  );
}
