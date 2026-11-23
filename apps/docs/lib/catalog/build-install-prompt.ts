import "server-only";

import {
  AGENT_SETUP_COMMAND,
  agentSetupFallback,
} from "@/lib/agent-setup-prompt";
import { BASE_URL } from "@/lib/constants";
import { getAgentPrompt } from "./agent-prompts";
import type { CatalogItem } from "./types";

const preamble = (
  setupCommand: string,
) => `Not in a setup yet? Run \`${setupCommand}\` instead of following this guide by hand. It is assistant-ui's own installer: run it in the background, where it keeps running as the guided setup's stream and points you back here. It asks the user the choices the project does not settle on a setup page they can open on any device, or through you in your own conversation. Already in a setup: keep going.

${AGENT_GATE_RULE}

${agentSetupFallback(setupCommand)}

Read ${BASE_URL}/llms.txt first. Append ".md" to any docs URL for raw markdown.

You are in a non-interactive agent shell. Never omit the flags the steps below name, and never invent keys or URLs; ask the user for them.

If a step requires assistant-ui cloud login or cloud setup in an active setup wizard, check the chosen CLI's cloud login --help first. When it supports --setup-url, pass the exact active URL already supplied to setup-agent: \`assistant-ui cloud login --setup-url "<active-setup-agent-url>"\`, or include the same flag on cloud setup. This is the setup-agent connection URL, not the browser's setup.assistant-ui.com URL; do not invent or log another session's URL. The wizard displays the public device code, opens Accounts for explicit consent, and waits for the CLI to poll Accounts directly. Never ask for an OAuth bearer token, device_code, refresh token or saved credentials through a setup question or secret input.

The listed product names are the starting goals. Read each setup guide, inspect the app, and follow dependency order. Explore related products through ${BASE_URL}/catalog.md when useful and include relevant prerequisites in the plan for approval; list membership does not constrain the implementation.`;

/** What the agent gate in the assistant-ui CLI lets a coding agent run, as the steps below need it. */
export const AGENT_GATE_RULE = `Inside a setup session, run the \`npx assistant-ui@latest\` init, create and add commands below as written. Outside one, the CLI refuses them for a coding agent and points to setup. Follow this guide by hand only when setup cannot run at all, and only once the user, told so in your own conversation, explicitly asks you to; then ask them every choice the project does not settle (above all the model provider and model) before you scaffold, and add \`--force\` to those commands.`;

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
  const setupCommand = `${AGENT_SETUP_COMMAND} --products ${products.map((product) => product.slug).join(",")}`;
  return [
    `# Install assistant-ui`,
    preamble(setupCommand),
    ...sections,
    closing,
  ].join("\n\n");
}
