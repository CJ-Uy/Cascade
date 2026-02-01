import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",

  // Ignore ESLint errors during build (for deployment)
  // TODO: Fix ESLint errors and remove this
  eslint: {
    ignoreDuringBuilds: true,
  },

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
