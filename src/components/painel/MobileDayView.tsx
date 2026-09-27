"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** No celular, a agenda sem visão escolhida abre no dia (a semana com 7 colunas fica apertada). */
export default function MobileDayView() {
  const router = useRouter(), pathname = usePathname(), sp = useSearchParams();
  useEffect(() => {
    if (sp.get("view") || window.innerWidth >= 768) return;
    router.replace(`${pathname}?${new URLSearchParams({ ...Object.fromEntries(sp), view: "dia" })}`);
  }, [router, pathname, sp]);
  return null;
}
