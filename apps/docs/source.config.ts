import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import { transformerMetaHighlight } from "@shikijs/transformers";
import { z } from "zod";
import { remarkMermaid } from '@theguild/remark-mermaid';


export const { docs, meta } = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema,
  },
});

export const blog = defineCollections({
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()).optional(),
  }),
  type: "doc",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid],
    rehypeCodeOptions: {
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerMetaHighlight(),
        transformerTwoslash({
          twoslashOptions: {
            compilerOptions: {
              jsx: 1, // JSX preserve
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
