/**
 * Template repository URLs for create-next-app.
 *
 * If you update this map, also update the duplicate in:
 *   packages/create-assistant-ui/src/index.ts
 */
export const TEMPLATES = {
  default: "https://github.com/assistant-ui/assistant-ui-starter",
  minimal: "https://github.com/assistant-ui/assistant-ui-starter-minimal",
  cloud: "https://github.com/assistant-ui/assistant-ui-starter-cloud",
  langgraph: "https://github.com/assistant-ui/assistant-ui-starter-langgraph",
  mcp: "https://github.com/assistant-ui/assistant-ui-starter-mcp",
} as const;

export type TemplateName = keyof typeof TEMPLATES;

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];
