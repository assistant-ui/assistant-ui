import rehypeCode from "@farming-labs/next/mdx-plugins/rehype-code";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerMetaHighlight } from "@shikijs/transformers";

export default function rehypeDocsCode() {
  return rehypeCode.call(this, {
    lazy: true,
    themes: { light: "catppuccin-latte", dark: "catppuccin-mocha" },
    transformers: [
      ...(rehypeCodeDefaultOptions.transformers ?? []),
      {
        name: "line-numbers",
        pre(node) {
          node.properties["data-line-numbers"] = "";
        },
      },
      transformerMetaHighlight(),
    ],
  });
}
