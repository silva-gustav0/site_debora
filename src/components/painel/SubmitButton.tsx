"use client";

import { useContext, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { ActionPendingContext } from "./ActionForm";

export default function SubmitButton({
  children, className = "p-btn", pendingText, ...rest
}: { children: ReactNode; className?: string; pendingText?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const formStatus = useFormStatus();
  const actionFormPending = useContext(ActionPendingContext);
  const pending = actionFormPending ?? formStatus.pending;
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending && <Loader2 size={13} className="animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
