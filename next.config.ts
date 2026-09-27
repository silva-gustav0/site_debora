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
    return [{ source: "/app/debora-equipe.apk", headers: [{ key: "Content-Type", value: "application/vnd.android.package-archive" }, { key: "Content-Disposition", value: "attachment" }] }];
  },
  experimental: {
    // Fotos do prontuário são comprimidas no navegador; o limite da Vercel é 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
    // Telas do painel visitadas há menos de 30 s reabrem na hora (salvar algo limpa esse cache).
    staleTimes: { dynamic: 30 },
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
