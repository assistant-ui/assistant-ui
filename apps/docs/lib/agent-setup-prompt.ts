// What a person tells their coding agent to set up assistant-ui. The agent
// runs the setup command, which opens the guided setup in the browser and
// prints the steps it follows.

export const AGENT_SETUP_PROMPT = "set up assistant-ui";

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

/** What agents read first wherever they look for setup instructions. */
export const AGENT_SETUP_HINT = `When the user asks you to "${AGENT_SETUP_PROMPT}", run \`${AGENT_SETUP_COMMAND}\`. Run it in the background and read its output: it keeps running as the guided setup's stream and opens the user's browser when it needs their input.`;
