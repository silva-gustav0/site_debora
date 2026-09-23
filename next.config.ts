import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Fotos do prontuário são comprimidas no navegador; o limite da Vercel é 4,5 MB.
    serverActions: { bodySizeLimit: "4mb" },
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
    ],
  },
};

export default nextConfig;
