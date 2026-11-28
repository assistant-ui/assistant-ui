/** The site's address, for a prompt that points an agent at one of its pages. */
export const LIBRARY_SITE = "https://www.assistant-ui.com";

const AGENT_SETUP_PROMPT = "install and set up assistant-ui";
const AGENT_SETUP_COMMAND = "npx assistant-ui@latest setup";

/** What a person tells their coding agent to set up assistant-ui, starting with specific catalog products, with any notes for the agent after it. */
export const agentSetupPrompt = (
  products: readonly string[] = [],
  notes?: string,
) => {
  // The prompt names the command: an agent that only hears "install and set up
  // assistant-ui" installs from what it already knows and never starts the setup.
  const command =
    products.length === 0 ||
    (products.length === 1 && products[0] === "assistant-ui")
      ? AGENT_SETUP_COMMAND
      : `${AGENT_SETUP_COMMAND} --products ${products.join(",")}`;
  const prompt = `${AGENT_SETUP_PROMPT} with \`${command}\``;
  return notes?.trim() ? `${prompt}. ${notes.trim()}` : prompt;
};
