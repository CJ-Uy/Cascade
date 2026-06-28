import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.CLOUDFLARE_BUILD !== "1" && {
    // Enable standalone output for Docker deployments
    output: "standalone" as const,
  }),

  // Ignore TypeScript errors during build (for deployment)
  // TODO: Fix TypeScript errors and remove this
  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
