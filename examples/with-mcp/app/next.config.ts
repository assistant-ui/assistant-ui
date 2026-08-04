import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@assistant-ui/react-mcp",
    "@assistant-ui/store",
    "@assistant-ui/tap",
    "@assistant-ui/ui",
  ],
  allowedDevOrigins: ["*"],
};

export default nextConfig;
