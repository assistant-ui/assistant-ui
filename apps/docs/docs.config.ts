import { defineDocs } from "@farming-labs/docs/config";
import { assistantUi } from "@assistant-ui/docs-theme";

export default defineDocs({
  entry: "(docs)/docs",
  docsPath: "/docs",
  contentDir: "content/docs",
  theme: assistantUi(),
  mdx: {
    remarkPlugins: ["./lib/remark-docs.mjs"],
    codeHighlighter: "./lib/rehype-docs-code.mjs",
  },
  review: false,
  mcp: false,
  sitemap: false,
  robots: false,
});
