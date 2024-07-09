import createMDX from "fumadocs-mdx/config";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@assistant-ui/*"],
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

export default withMDX(config);
