import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "esbuild",
    "@tailwindcss/postcss",
    "@tailwindcss/node",
    "@tailwindcss/oxide",
    "lightningcss",
  ],
};

export default nextConfig;
