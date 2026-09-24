import Link from "next/link";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/** Painel lateral controlado pela URL: fechar = navegar para `closeHref`. */
export default function Drawer({
  title, eyebrow, closeHref, children,
}: { title: ReactNode; eyebrow?: string; closeHref: string; children: ReactNode }) {
  return (
    <>
      <Link href={closeHref} scroll={false} className="p-drawer-backdrop no-print" aria-label="Fechar painel" />
      <aside className="p-drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 px-6 pt-5 pb-4 bg-[#FFFCFB]/95 backdrop-blur border-b border-[#F3ECE0]">
          <div>
            {eyebrow && <p className="p-eyebrow mb-1">{eyebrow}</p>}
            <h2 className="p-display text-[1.8rem] leading-tight text-[#2B221B]">{title}</h2>
          </div>
          <Link href={closeHref} scroll={false} className="p-btn-ghost p-btn-sm mt-1" aria-label="Fechar">
            <X size={16} />
          </Link>
        </header>
        <div className="px-6 py-5">{children}</div>
      </aside>
    </>
  );
}
