import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Permite que o Turbopack use os certificados confiáveis do Windows ao
    // baixar fontes e outros recursos HTTPS.
    turbopackUseSystemTlsCerts: true,
  },
  images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "cdn-icons-png.flaticon.com",
    },
  ],
},
};

export default nextConfig;
