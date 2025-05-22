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

export default withMDX(config);
