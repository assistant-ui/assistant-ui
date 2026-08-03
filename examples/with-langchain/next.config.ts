import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: false },
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-langchain"],
};

export default withAui(nextConfig);
