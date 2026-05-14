import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-langchain"],
};

export default nextConfig;
