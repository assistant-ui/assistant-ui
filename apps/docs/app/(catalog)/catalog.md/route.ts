import { AGENT_DOCS_DIRECTIVE_MARKDOWN } from "@/lib/agent-docs-directive";
import {
  CATALOG,
  CATALOG_ITEMS,
  CATALOG_KIND_LABELS,
  formatMinutes,
} from "@/lib/catalog";
import { installGuideUrl } from "@/lib/catalog/install-guide";
import { checkoutEnabled } from "@/lib/checkout/config";
import { BASE_URL } from "@/lib/constants";
import { createMarkdownResponse } from "@/lib/markdown-response";

export const revalidate = false;

const formatProduct = (product: (typeof CATALOG)[number]) =>
  [
    `## ${product.name}`,
    "",
    `Slug: ${product.slug}`,
    `Kind: ${CATALOG_KIND_LABELS[product.kind]}`,
    `License: ${product.license}${product.oss ? ", open source" : ""}`,
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
    ...(product.features
      ? [
          "Works out of the box:",
          ...product.features.map((item) => `- ${item}`),
          "",
        ]
      : []),
    "Requires:",
    ...product.requires.map((item) => `- ${item}`),
  ].join("\n");

export function GET() {
  if (!checkoutEnabled) return new Response("Not found", { status: 404 });
  const markdown = [
    "# assistant-ui catalog",
    "",
    AGENT_DOCS_DIRECTIVE_MARKDOWN,
    "",
    "Everything you can add to an assistant-ui project. To install a set of products, fetch the install guide with their slugs, for example:",
    "",
    `${BASE_URL}${installGuideUrl(CATALOG.map((product) => product.slug))}`,
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
