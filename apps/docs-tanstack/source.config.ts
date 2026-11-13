import {
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from "fumadocs-mdx/config";
import { remarkNpm, rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerMetaHighlight } from "@shikijs/transformers";
import { visit } from "unist-util-visit";
import { z } from "zod";

const C = "../docs/content";
// Real frontmatter has extra keys (links, platforms, author, ...); keep them.
const page = frontmatterSchema.extend({}).passthrough();
const meta = metaSchema.extend({}).passthrough();
const docsOpts = (dir: string) =>
  defineDocs({
    dir: `${C}/${dir}`,
    docs: { schema: page },
    meta: { schema: meta },
  });

export const docs = docsOpts("docs");
export const docsSites = docsOpts("docs-sites");
export const elements = docsOpts("elements");
export const design = docsOpts("design");
export const examples = docsOpts("examples");
export const blog = docsOpts("blog");
export const careers = docsOpts("careers");

// Same as apps/docs/lib/remark-docs.mjs (remarkImage + remarkCodeTab are fumadocs-mdx defaults).
function remarkMermaid() {
  return (tree: any) => {
    visit(tree, "code", (node: any, index, parent: any) => {
      if (
        node.lang !== "mermaid" ||
        !node.value.trim() ||
        !parent ||
        index === undefined
      )
        return;
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "MermaidDiagram",
        attributes: [],
        children: [{ type: "text", value: node.value }],
      };
    });
  };
}

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (v) => [...v, remarkNpm, remarkMermaid],
    // Compile-time shiki, same themes/transformers as lib/docs-code.tsx.
    rehypeCodeOptions: {
      lazy: true,
      themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
      transformers: [
        ...(rehypeCodeDefaultOptions.transformers ?? []),
        transformerMetaHighlight(),
      ],
    },
  },
});
void z;
