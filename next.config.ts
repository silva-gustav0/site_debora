import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Bindings do Cloudflare disponíveis também no `next dev`.
initOpenNextCloudflareForDev();

// Fotos do site enviadas pelo painel ficam no Storage público do Supabase.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const supabaseOrigins = supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : "";

// Cabeçalhos de segurança de todas as páginas. O Next precisa de scripts inline; em desenvolvimento, também de eval.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseHost ? `https://${supabaseHost}` : ""} https://images.unsplash.com https://plus.unsplash.com`,
  `connect-src 'self' ${supabaseOrigins}`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
];
// Páginas com token na URL não repassam o endereço para outros sites.
const noReferrer = [{ key: "Referrer-Policy", value: "no-referrer" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Versão publicada (o painel avisa quando há deploy novo): commit do GitHub Actions ou hora do build.
  env: { APP_BUILD_ID: process.env.GITHUB_SHA || String(Date.now()) },
  // Endereço único do site: www → sem www.
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "www.deborasilvaestetica.com.br" }], destination: "https://deborasilvaestetica.com.br/:path*", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/meu-agendamento/:path*", headers: noReferrer },
      { source: "/anamnese/:path*", headers: noReferrer },
      { source: "/voucher/:path*", headers: noReferrer },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      // O APK do app da equipe baixa como arquivo instalável no Android.
      { source: "/app/debora-equipe.apk", headers: [{ key: "Content-Type", value: "application/vnd.android.package-archive" }, { key: "Content-Disposition", value: "attachment" }] },
    ];
  },
  experimental: {
    // Fotos do prontuário são comprimidas no navegador; o limite da Vercel é 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
    // Telas do painel ficam guardadas no app por 5 min; o tempo real (LiveSync) limpa tudo quando o banco muda.
    staleTimes: { dynamic: 300, static: 300 },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      // Só o Storage deste projeto (e não o de qualquer projeto Supabase).
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
    ],
  },
};

export default nextConfig;
