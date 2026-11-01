import {
  rehypeCode,
  rehypeCodeDefaultOptions,
} from "fumadocs-core/mdx-plugins";
import { transformerMetaHighlight } from "@shikijs/transformers";

export default function rehypeDocsCode() {
  return rehypeCode({
    lazy: true,
    langs: ["ts", "js", "html", "tsx", "mdx", "bash"],
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
