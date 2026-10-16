import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@assistant-ui/ai-sdk"],
  },
};

export default withAui(nextConfig);
