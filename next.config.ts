import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  devIndicators: false,
  // Default App Router server-action body limit is 1MB which is way too small
  // for PDF uploads. 30 MB covers ~95% of real lecture PDFs.
  experimental: {
    serverActions: { bodySizeLimit: '30mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // diagrams can come from any source
    ],
  },
};

export default nextConfig;
