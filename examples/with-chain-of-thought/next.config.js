import { withAui } from "@assistant-ui/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { useTypeScriptCli: false },
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
};

export default withAui(nextConfig);
