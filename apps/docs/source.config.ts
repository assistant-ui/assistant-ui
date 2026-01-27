import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerTwoslash } from "fumadocs-twoslash";
import { transformerMetaHighlight } from "@shikijs/transformers";
import { z } from "zod";
import { remarkMermaid } from "@theguild/remark-mermaid";
import { createFileSystemTypesCache } from "fumadocs-twoslash/cache-fs";
import lastModified from "fumadocs-mdx/plugins/last-modified";
import type { ShikiTransformer } from "shiki";

function transformerLineNumbers(): ShikiTransformer {
  return {
    name: "line-numbers",
    pre(node) {
      node.properties["data-line-numbers"] = "";
    },
  };
}

export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema.extend({
      links: z
        .array(
          z.object({
            label: z.string(),
            url: z.string(),
          }),
        )
        .optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export const examples = defineCollections({
  type: "doc",
  dir: "content/examples",
  schema: frontmatterSchema,
});

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.date().optional(),
  }),
});

export const careers = defineCollections({
  type: "doc",
  dir: "content/careers",
  schema: frontmatterSchema.extend({
    order: z.number().optional(),
    location: z.string(),
    type: z.string(),
    salary: z.string(),
    summary: z.string(),
  }),
});

export default defineConfig({
  plugins: [lastModified()],
  mdxOptions: {
    remarkPlugins: [remarkMermaid],
    rehypeCodeOptions: {
      lazy: true,
      langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
      themes: {
        light: "catppuccin-latte",
        dark: "catppuccin-mocha",
      },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerLineNumbers(),
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
