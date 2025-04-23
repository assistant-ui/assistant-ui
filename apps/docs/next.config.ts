import { withSentryConfig } from "@sentry/nextjs";
import { createMDX } from "fumadocs-mdx/next";
import { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@assistant-ui/*"],
  serverExternalPackages: ["twoslash"],
  rewrites: async () => ({
    beforeFiles: [
      {
        source: "/umami/:path*",
        destination: "https://assistant-ui-umami.vercel.app/:path*",
      },
    ],
    fallback: [
      {
        source: "/registry/:path*",
        destination: "https://ui.shadcn.com/registry/:path*",
      },
    ],
  }),
};

const withMDX = createMDX();

export default withSentryConfig(withMDX(config), {
  org: "assistant-ui",
  project: "javascript-nextjs",
  silent: !process.env["CI"],
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  // hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
