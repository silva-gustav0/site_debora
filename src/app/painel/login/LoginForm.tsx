"use client";

import { startTransition, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "../auth-actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, null);

  // Envio sem reset automático: se a senha estiver errada, o e-mail continua preenchido.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="p-label">E-mail</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="p-input" />
      </div>
      <div>
        <label htmlFor="password" className="p-label">Senha</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="p-input" />
      </div>
      {state && !state.ok && !pending && (
        <p role="alert" className="text-sm rounded-lg px-3 py-2" style={{ background: "#FFF1F1", color: "#9B2C2C" }}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="p-btn w-full py-2.5 mt-1">
        {pending && <Loader2 size={14} className="animate-spin" />} Entrar
      </button>
    </form>
  );
}
