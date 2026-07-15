import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@assistant-ui/react",
    "@assistant-ui/react-ai-sdk",
    "@assistant-ui/react-mastra",
  ],
};

export default withAui(nextConfig);
