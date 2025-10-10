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
import { remarkMermaid } from "@theguild/remark-mermaid";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import { remarkAutoTypeTable } from "fumadocs-typescript";
import { generator } from "./lib/fumadocs-generator";

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

export const careers = defineCollections({
  dir: "content/careers",
  schema: frontmatterSchema.extend({
    order: z.number().optional(),
    location: z.string(),
    type: z.string(),
    salary: z.string(),
    summary: z.string(),
  }),
  type: "doc",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkMermaid, [remarkAutoTypeTable, { generator }]],
    rehypeCodeOptions: {
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
      langs: ["js", "bash"],
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),

        transformerMetaHighlight(),
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
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
