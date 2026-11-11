// The one line a person pastes into their coding agent to set up
// assistant-ui. The agent runs the command, which opens the guided setup in
// the browser and prints the steps the agent follows.

export const AGENT_SETUP_COMMAND = "npx assistant-ui@latest setup";

export const AGENT_SETUP_PROMPT = `Set up assistant-ui with \`${AGENT_SETUP_COMMAND}\``;

/** What agents read first wherever they look for setup instructions. */
export const AGENT_SETUP_HINT = `Recommended for coding agents: run \`${AGENT_SETUP_COMMAND}\`. It opens a guided setup in the user's browser and walks you through the install.`;
