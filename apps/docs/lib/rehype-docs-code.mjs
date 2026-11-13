import { rehypeCode } from "fumadocs-core/mdx-plugins/rehype-code";
import { rehypeCodeDefaultOptions } from "fumadocs-core/mdx-plugins";
import { transformerMetaHighlight } from "@shikijs/transformers";

export default function rehypeDocsCode() {
  return rehypeCode.call(this, {
    engine: "oniguruma",
    lazy: true,
    // Farm compiles each page for the browser and the server separately, so
    // the grammars other grammars embed must not depend on compile order.
    langs: [
      "yaml",
      "toml",
      "json",
      "jsonc",
      "html",
      "css",
      "javascript",
      "typescript",
      "jsx",
      "tsx",
      "shellscript",
      "markdown",
      "mdx",
    ],
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
