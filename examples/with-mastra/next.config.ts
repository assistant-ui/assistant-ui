import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "commonjs canvas" }];
    // Ignore non-JS files in node_modules
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
  async rewrites() {
    const assistantTarget =
      process.env.ASSISTANT_API_URL || "http://localhost:8000";
    return [
      {
        source: "/assistant/:path*",
        destination: `${assistantTarget}/assistant/:path*`,
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
