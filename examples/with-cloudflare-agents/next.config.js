/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@assistant-ui/react",
    "@assistant-ui/react-ai-sdk",
    "@assistant-ui/react-cloudflare-agents",
  ],
};

export default nextConfig;
