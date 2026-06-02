import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  devIndicators: false,
  // Default API-route body limit in Next.js 16 is 10MB which is way too small
  // for PDF uploads (lectures are commonly 10-30MB). middlewareClientMaxBodySize
  // is the correct knob for /api route bodies; serverActions.bodySizeLimit
  // covers Server Actions (different code path). Both bumped to 30MB.
  // The option isn't in NextConfig's public types yet so we cast it on.
  ...({ middlewareClientMaxBodySize: '30mb' } as Partial<NextConfig>),
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
