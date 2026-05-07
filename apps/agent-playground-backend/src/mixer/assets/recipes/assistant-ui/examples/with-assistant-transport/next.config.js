/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@assistant-ui/react"],
  },
  async rewrites() {
    return [
      {
        source: "/assistant/:path*",
        destination: "http://localhost:8000/assistant/:path*",
      },
    ];
  },
};

export default nextConfig;
