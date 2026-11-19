import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingExcludes: {
    "*": ["dev.db*", "*.db*", "*.bak*", "backups/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/package-passport",
        destination: "/packages",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
