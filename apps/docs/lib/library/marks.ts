/**
 * What is drawn before an item's name, by the item's id. `logo:` is a brand
 * mark, `agent:` a coding agent's mark, `icon:` the icon kept for that id in
 * component-icons.tsx, and the rest are the library's own
 * line drawings: `skill:` a skill's, `section:` a tab's, `utility:` a
 * utility's. An item missing here shows its first letter.
 */
export const LIBRARY_MARKS: Record<string, string> = {
  "runtimes/ai-sdk": "logo:vercel",
  "runtimes/langgraph": "logo:langgraph",
  "runtimes/langchain": "logo:langchain",
  "runtimes/eve": "logo:eve",
  "runtimes/google-adk": "logo:adk",
  "runtimes/a2a": "logo:a2a",
  "runtimes/ag-ui": "logo:agui",
  "runtimes/opencode": "logo:opencode",
  "runtimes/openai-agents": "logo:openai",
  "runtimes/pydantic-ai": "logo:pydantic",
  "runtimes/cloudflare-agents": "logo:cloudflare",
  "runtimes/mastra": "logo:mastra",
  "runtimes/claude-managed-agents": "logo:claude",
  "runtimes/custom-local-runtime": "logo:assistant-ui",
  "runtimes/custom-external-store": "logo:assistant-ui",
  "runtimes/custom-data-stream": "logo:assistant-ui",
  "runtimes/custom-assistant-transport": "logo:assistant-ui",

  "integrations/gateways": "section:integrations",
  "integrations/observability-langfuse": "logo:langfuse",
  "integrations/observability-langsmith": "logo:langchain",
  "integrations/observability-assistant-cloud": "logo:assistant-ui",
  "integrations/auth-clerk": "logo:clerk",
  "integrations/auth-better-auth": "logo:better-auth",
  "integrations/auth-next-auth": "logo:authjs",
  "integrations/persistence-custom-adapter": "skill:cloud",
  "integrations/persistence-thread-list-adapters": "skill:thread-list",
  "integrations/attachments-custom-adapter": "section:blocks",

  "utilities/heat-graph": "utility:heat",
  "utilities/tw-shimmer": "utility:shimmer",
  "utilities/react-o11y": "utility:o11y",
  "utilities/devtools": "skill:observability",
  "utilities/safe-content-frame": "utility:frame",
  "utilities/generative-frame": "skill:generative-ui",
  "utilities/variants": "skill:assistant-ui",

  "mcp/cursor": "agent:cursor",
  "mcp/windsurf": "agent:windsurf",
  "mcp/vscode": "logo:vscode",
  "mcp/zed": "agent:zed",
  "mcp/claude-code": "agent:claude-code",
  "mcp/claude-desktop": "logo:claude",
};
