import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  devIndicators: false,
  // Next.js 16 caps API-route request bodies at 10MB by default. Lecture
  // PDFs commonly run 10-30MB, so we raise it. The option's real name is
  // `middlewareClientMaxBodySize` (per Next's own runtime error message)
  // but it lives under experimental in 16.x and is missing from the public
  // NextConfig type, so we cast it on inside experimental.
  // serverActions.bodySizeLimit is a separate cap for Server Actions —
  // bumped to match for completeness.
  experimental: {
    serverActions: { bodySizeLimit: '30mb' },
    ...({ middlewareClientMaxBodySize: '30mb' } as Record<string, string>),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }, // diagrams can come from any source
    ],
  },
};

export default nextConfig;
