import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Pi SDK is a native Node dependency; keep it external to the server
  // bundle so Next doesn't try to trace/bundle it.
  serverExternalPackages: ["@earendil-works/pi-coding-agent"],
};

export default withAui(nextConfig);
