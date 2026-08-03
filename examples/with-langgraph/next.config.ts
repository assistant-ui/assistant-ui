import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: false },
  async rewrites() {
    return [
      {
        source: "/assistant/:path*",
        destination: "http://localhost:8000/assistant/:path*",
      },
    ];
  },
};

export default withAui(nextConfig);
