import { withAui } from "@assistant-ui/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-google-adk"],
  // @google/adk reaches its optional Google Cloud and database peers through
  // dynamic require, which Turbopack would otherwise resolve at build time.
  serverExternalPackages: ["@google/adk"],
};

export default withAui(nextConfig);
