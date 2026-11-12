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

/** For agents whose package runner resolves a release without `setup`, such as pnpm's minimum release age. */
export const agentSetupFallback = (command = AGENT_SETUP_COMMAND) =>
  `If \`setup\` isn't a known command (an older cached or release-age-gated version), run \`${command.replace(/^npx /, "npx -y ")}\` instead.`;

export const AGENT_SETUP_FALLBACK = agentSetupFallback();

/** What agents read first wherever they look for setup instructions. */
export const AGENT_SETUP_HINT = `When the user asks you to "${AGENT_SETUP_PROMPT}" (or "${LEGACY_AGENT_SETUP_PROMPTS[0]}"), run \`${AGENT_SETUP_COMMAND}\`. It opens a guided setup in the user's browser and walks you through the install. ${AGENT_SETUP_FALLBACK}`;
