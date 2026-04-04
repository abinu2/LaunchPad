import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  // Skip static optimization for pages that require runtime auth/db context
  staticPageGenerationTimeout: 0,
};

export default nextConfig;
