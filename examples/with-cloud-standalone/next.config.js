import { withAui } from "@assistant-ui/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { useTypeScriptCli: false },
  transpilePackages: ["assistant-cloud"],
};

export default withAui(nextConfig);
