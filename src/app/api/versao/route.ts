import { APK_VERSION, WEB_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Consultado pelo painel aberto para saber se há versão nova publicada. */
export function GET() {
  return Response.json({ web: WEB_VERSION, apk: APK_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
