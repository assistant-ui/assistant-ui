import { withAui } from "@assistant-ui/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { useTypeScriptCli: false },
};

export default withAui(nextConfig);
