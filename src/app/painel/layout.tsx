import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { manifest: "/painel.webmanifest", icons: { icon: "/app/icon-192.png", apple: "/app/icon-192.png" } };
export const viewport: Viewport = { themeColor: "#29201A" };

/** Painel instalável como app (manifesto só da área da equipe). */
export default function PanelRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
