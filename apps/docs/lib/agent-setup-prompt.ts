import { BASE_URL } from "./constants";

// What a person tells their coding agent to set up assistant-ui. The agent
// runs the setup command, which opens the guided setup in the browser and
// prints the steps it follows.

export const AGENT_SETUP_PROMPT = "install and set up assistant-ui";

export const AGENT_SETUP_COMMAND = "npx assistant-ui@latest setup";

/** The prompt for a setup that starts with specific catalog products, with any notes for the agent after it. */
export const agentSetupPrompt = (
  products: readonly string[] = [],
  notes?: string,
) => {
  const prompt =
    products.length === 0 ||
    (products.length === 1 && products[0] === "assistant-ui")
      ? AGENT_SETUP_PROMPT
      : `${AGENT_SETUP_PROMPT} with \`${AGENT_SETUP_COMMAND} --products ${products.join(",")}\``;
  return notes?.trim() ? `${prompt}. ${notes.trim()}` : prompt;
};

/** Older copies of the prompt that agents should still answer the same way. */
export const LEGACY_AGENT_SETUP_PROMPTS = ["set up assistant-ui"] as const;

/** The prompt for one docs page's setup: the page's canonical URL, which serves its full steps as markdown. */
export const pageSetupPrompt = (path: string) =>
  `set up ${new URL(path, BASE_URL).href}`;

/** What a page's markdown tells an agent where the setup banner sits. */
export const agentSetupLine = (products: readonly string[]) =>
  `To set this up with a coding agent, run \`${AGENT_SETUP_COMMAND} --products ${products.join(",")}\`.`;

/** What a page's markdown tells an agent before its manual steps. */
export const pageSetupPreamble = (products: readonly string[]) =>
  `To set this up, run \`${AGENT_SETUP_COMMAND} --products ${products.join(",")}\` if available; otherwise follow these steps.`;

/** For agents whose package runner resolves a release without `setup`, such as pnpm's minimum release age. */
export const agentSetupFallback = (command = AGENT_SETUP_COMMAND) =>
  `If \`setup\` isn't a known command (a cached or pnpm release-age-gated version), run \`${command.replace(/^npx /, "npx -y --prefer-online ")}\` instead.`;

export const AGENT_SETUP_FALLBACK = agentSetupFallback();

/** What agents read first wherever they look for setup instructions. */
export const AGENT_SETUP_HINT = `When the user asks you to "${AGENT_SETUP_PROMPT}" (or "${LEGACY_AGENT_SETUP_PROMPTS[0]}"), run \`${AGENT_SETUP_COMMAND}\`. Run it in the background and read its output: it keeps running as the guided setup's stream and opens the user's browser when it needs their input. ${AGENT_SETUP_FALLBACK}`;
