import "server-only";

import { BASE_URL } from "@/lib/constants";
import { getAgentPrompt } from "./agent-prompts";
import type { CatalogItem } from "./types";

const preamble = `Read ${BASE_URL}/llms.txt first. Append ".md" to any docs URL for raw markdown.

You are in a non-interactive agent shell. Never omit the flags the steps below name, and never invent keys or URLs; ask the user for them.

If a step requires assistant-ui cloud login or cloud setup in an active setup wizard, check the chosen CLI's cloud login --help first. When it supports --setup-url, pass the exact active URL already supplied to setup-agent: \`assistant-ui cloud login --setup-url "<active-setup-agent-url>"\`, or include the same flag on cloud setup. This is the setup-agent connection URL, not the browser's /components/setup URL; do not invent or log another session's URL. The wizard displays the public device code, opens Accounts for explicit consent, and waits for the CLI to poll Accounts directly. Never ask for an OAuth bearer token, device_code, refresh token or saved credentials through a setup question or secret input.

Keep the package and version required by the product guide. The existing hackathon CLI preview does not support --setup-url: use its normal --no-open device flow and let the user open the printed approval link, keeping their wizard tab open. Do not switch packages, recreate a project or retry provisioning to add wizard sign-in.

Install the products in the order listed. Each one assumes the previous ones are in place.`;

const closing = `When every product is installed, start the dev server and run the verification line under each product. Report the exact error to the user if one fails; do not loop.`;

export function buildInstallPrompt(products: readonly CatalogItem[]): string {
  const sections = products.map((product, index) => {
    const prompt = getAgentPrompt(product.slug);
    if (prompt === undefined) {
      throw new Error(`Missing agent prompt for catalog item: ${product.slug}`);
    }
    const docs = product.docs.startsWith("https://")
      ? product.docs
      : `${BASE_URL}${product.docs}.md`;
    return `## ${index + 1}. ${product.name}\n\nDocs: ${docs}\n\n${prompt}`;
  });
  return [`# Install assistant-ui`, preamble, ...sections, closing].join(
    "\n\n",
  );
}
