import { defineDocs } from "@farming-labs/docs";
import { assistantUi } from "@assistant-ui/docs-theme";

export default defineDocs({
  entry: "(docs)/docs",
  docsPath: "/docs",
  contentDir: "content/docs",
  theme: assistantUi(),
  review: false,
  mcp: false,
  sitemap: false,
  robots: false,
});
