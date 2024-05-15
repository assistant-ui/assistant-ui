import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
  defaultShowCopyCode: true,
  mdxOptions: {
    rehypePrettyCodeOptions: {
      theme: {
        light: "github-light",
        dark: "slack-dark",
      },
    },
  },
});

export default withNextra({
  transpilePackages: ["@assistant-ui/*"],
  rewrites: async () => ({
    fallback: [
      {
        source: "/registry/:path*",
        destination: "https://ui.shadcn.com/registry/:path*",
      },
    ],
  }),
});
