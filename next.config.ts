import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // diagrams can come from any source
    ],
  },
};

export default nextConfig;
