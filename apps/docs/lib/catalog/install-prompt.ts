import { BASE_URL } from "@/lib/constants";
import type { CatalogProduct } from "./types";

const preamble = `Read ${BASE_URL}/llms.txt first. Append ".md" to any docs URL for raw markdown.

You are in a non-interactive agent shell. Never omit the flags the steps below name, and never invent keys or URLs; ask the user for them.

Install the products in the order listed. Each one assumes the previous ones are in place.`;

const closing = `When every product is installed, start the dev server and run the verification line under each product. Report the exact error to the user if one fails; do not loop.`;

export function buildInstallPrompt(
  products: readonly CatalogProduct[],
): string {
  const sections = products.map(
    (product, index) =>
      `## ${index + 1}. ${product.name}\n\nDocs: ${BASE_URL}${product.docs}.md\n\n${product.agent}`,
  );
  return [
    `# Install from the assistant-ui catalog`,
    preamble,
    ...sections,
    closing,
  ].join("\n\n");
}

/** Shareable cart URL that restores the cart on any device or in an agent. */
export function cartUrl(
  slugs: readonly string[],
  { markdown = false, absolute = false } = {},
): string {
  const path = `/catalog/cart${markdown ? ".md" : ""}`;
  const query = slugs.length > 0 ? `?items=${slugs.join(",")}` : "";
  return `${absolute ? BASE_URL : ""}${path}${query}`;
}

export function parseCartItems(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}
