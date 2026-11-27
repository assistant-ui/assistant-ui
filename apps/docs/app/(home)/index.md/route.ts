import { cacheLife } from "next/cache";
import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import {
  HOME_DESCRIPTION,
  HOME_LIBRARY,
  HOME_TITLE,
  SETUP_SNIPPETS,
} from "@/lib/home-setup";
import { createMarkdownResponse } from "@/lib/markdown-response";

async function getMarkdown() {
  "use cache";
  cacheLife("max");
  const markdown = [
    `# ${HOME_TITLE}`,
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    HOME_DESCRIPTION,
    `## ${HOME_LIBRARY.title}`,
    HOME_LIBRARY.description,
    ...SETUP_SNIPPETS.flatMap(({ label, caption, code, docs }) => [
      `### ${label}`,
      caption,
      ["```tsx", code, "```"].join("\n"),
      `[Read the ${label} guide](${docs})`,
    ]),
    "[Examples](/examples) · [Components](/components) · [Contact sales](/contact-sales) · [Privacy](/privacy-policy)",
  ].join("\n\n");

  return `${markdown}\n`;
}

export async function GET() {
  return createMarkdownResponse(await getMarkdown());
}
