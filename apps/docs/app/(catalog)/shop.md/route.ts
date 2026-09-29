import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import {
  CATALOG,
  CATALOG_ITEMS,
  CATALOG_KIND_LABELS,
  formatMinutes,
} from "@/lib/catalog";
import { cartUrl } from "@/lib/catalog/install-prompt";
import { shopEnabled } from "@/lib/checkout/config";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const revalidate = false;

const formatProduct = (product: (typeof CATALOG)[number]) =>
  [
    `## ${product.name}`,
    "",
    `Slug: ${product.slug}`,
    `Kind: ${CATALOG_KIND_LABELS[product.kind]}`,
    `Price: Free (${product.license}${product.oss ? ", open source" : ""})`,
    `For: ${product.audience}`,
    `Docs: ${BASE_URL}${product.docs}.md`,
    `Packages: ${product.packages.join(", ")}`,
    `Agent time: ${formatMinutes(product.agentMinutes)}`,
    "",
    product.description,
    "",
    "Includes:",
    ...product.includes.map((item) => `- ${item}`),
    "",
    "Requires:",
    ...product.requires.map((item) => `- ${item}`),
  ].join("\n");

export function GET() {
  if (!shopEnabled) return new Response("Not found", { status: 404 });
  const markdown = [
    "# assistant-ui shop",
    "",
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    "",
    "Everything you can add to an assistant-ui project. Every product is free. To install a set of products, fetch the cart as markdown with their slugs, for example:",
    "",
    `${BASE_URL}${cartUrl(
      CATALOG.map((product) => product.slug),
      { markdown: true },
    )}`,
    "",
    ...CATALOG.map(formatProduct),
    "",
    "## Guides and elements",
    "",
    "Each of these installs the same way, by slug:",
    "",
    ...CATALOG_ITEMS.filter(
      (item) => !CATALOG.some((product) => product.slug === item.slug),
    ).map(
      (item) =>
        `- ${item.slug}: ${item.name} (${BASE_URL}${item.docs}.md, agent time ${formatMinutes(item.agentMinutes)})`,
    ),
    "",
  ].join("\n");

  return createMarkdownResponse(markdown);
}
