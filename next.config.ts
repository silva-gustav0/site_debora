import type { NextConfig } from "next";

// Fotos do site enviadas pelo painel ficam no Storage público do Supabase.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  // O APK do app da equipe baixa como arquivo instalável no Android.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] }, { source: "/app/debora-equipe.apk", headers: [{ key: "Content-Type", value: "application/vnd.android.package-archive" }, { key: "Content-Disposition", value: "attachment" }] }];
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
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseHost && !supabaseHost.endsWith(".supabase.co")
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
};

export default nextConfig;
