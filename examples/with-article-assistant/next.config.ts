import type { NextConfig } from "next";

const nextConfig: NextConfig =
  process.env.npm_lifecycle_event === "build:appos"
    ? {
        adapterPath: require.resolve("@assistant-ui/appos/next"),
        distDir: ".next-appos",
      }
    : {};

export default nextConfig;
