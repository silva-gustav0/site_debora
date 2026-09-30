import { APK_URL, APK_VERSION, APK_VERSION_NAME, WEB_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/** Consultado pelo painel aberto e pelo app do tablet para saber se há versão nova publicada. */
export function GET() {
  return Response.json({ web: WEB_VERSION, apk: APK_VERSION, apkName: APK_VERSION_NAME, apkUrl: APK_URL }, { headers: { "Cache-Control": "no-store" } });
}
