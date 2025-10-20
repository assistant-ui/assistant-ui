import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    // Ignore non-JS files in node_modules
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/assistant/:path*",
        destination: "http://localhost:8000/assistant/:path*",
      },
    ];
  },
  serverExternalPackages: [
    "@mastra/libsql",
    "libsql",
    "@mastra/core",
    "@mastra/memory",
  ],
};

export default nextConfig;
