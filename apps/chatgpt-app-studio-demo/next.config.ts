import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "esbuild",
    "@tailwindcss/postcss",
    "@tailwindcss/node",
    "@tailwindcss/oxide",
    "lightningcss",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://assistant-ui.com https://*.assistant-ui.com https://*.vercel.app http://localhost:*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
