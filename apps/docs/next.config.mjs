import createMDX from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import { transformerMetaHighlight } from "@shikijs/transformers";

const withMDX = createMDX({
  mdxOptions: {
    rehypeCodeOptions: {
      transformers: [
        ...rehypeCodeDefaultOptions.transformers,
        transformerMetaHighlight(),
        transformerTwoslash({
          twoslashOptions: {
            compilerOptions: {
              jsx: 12,
              paths: {
                "@/*": ["./*"],
              },
            },
          },
        }),
      ],
    },
  },
});

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
