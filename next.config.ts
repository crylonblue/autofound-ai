import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Convex codegen on Vercel produces anyApi which types as {}.
    // Types are validated locally; skip on Vercel to avoid false positives.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
