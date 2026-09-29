import "server-only";

import { AGENT_TOOLS_AGENT_PROMPTS } from "./products/agent-tools.agent";
import { ASSISTANT_UI_AGENT_PROMPTS } from "./products/assistant-ui.agent";
import { CLOUD_AGENT_PROMPTS } from "./products/cloud.agent";
import { ELEMENT_AGENT_PROMPTS } from "./products/elements.agent";
import { GUIDE_AGENT_PROMPTS } from "./products/guides.agent";
import { REACT_APP_AGENT_PROMPTS } from "./products/react-app.agent";

const agentPrompts = new Map<string, string>([
  ...REACT_APP_AGENT_PROMPTS,
  ...ASSISTANT_UI_AGENT_PROMPTS,
  ...CLOUD_AGENT_PROMPTS,
  ...AGENT_TOOLS_AGENT_PROMPTS,
  ...GUIDE_AGENT_PROMPTS,
  ...ELEMENT_AGENT_PROMPTS,
]);

export const getAgentPrompt = (slug: string): string | undefined =>
  agentPrompts.get(slug);
