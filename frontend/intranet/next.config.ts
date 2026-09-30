import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
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
