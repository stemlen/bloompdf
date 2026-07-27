import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "stemlen.com",
      },
      {
        protocol: "https",
        hostname: "fairlx.com",
      },
      {
        protocol: "https",
        hostname: "schoolstacker.app",
      },
    ],
  },
};

export default nextConfig;
