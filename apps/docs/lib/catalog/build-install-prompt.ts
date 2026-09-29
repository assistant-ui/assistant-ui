import "server-only";

import { BASE_URL } from "@/lib/constants";
import { getAgentPrompt } from "./agent-prompts";
import type { CatalogItem } from "./types";

const preamble = `Read ${BASE_URL}/llms.txt first. Append ".md" to any docs URL for raw markdown.

You are in a non-interactive agent shell. Never omit the flags the steps below name, and never invent keys or URLs; ask the user for them.

Install the products in the order listed. Each one assumes the previous ones are in place.`;

const closing = `When every product is installed, start the dev server and run the verification line under each product. Report the exact error to the user if one fails; do not loop.`;

export function buildInstallPrompt(products: readonly CatalogItem[]): string {
  const sections = products.map((product, index) => {
    const prompt = getAgentPrompt(product.slug);
    if (prompt === undefined) {
      throw new Error(`Missing agent prompt for catalog item: ${product.slug}`);
    }
    return `## ${index + 1}. ${product.name}\n\nDocs: ${BASE_URL}${product.docs}.md\n\n${prompt}`;
  });
  return [
    `# Install from the assistant-ui shop`,
    preamble,
    ...sections,
    closing,
  ].join("\n\n");
}
