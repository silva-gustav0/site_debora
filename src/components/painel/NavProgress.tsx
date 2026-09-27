"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Barra dourada no topo assim que um link do painel é tocado, até a nova tela aparecer. */
export default function NavProgress() {
  const pathname = usePathname(), search = useSearchParams().toString();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin === location.origin && url.pathname.startsWith("/painel") && url.href !== location.href) setPending(url.pathname + url.search);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPending(null), 0);
    return () => clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setPending(null), 15000);
    return () => clearTimeout(t);
  }, [pending]);

  return pending ? <div className="nav-progress no-print" role="progressbar" aria-label="Abrindo" /> : null;
}
