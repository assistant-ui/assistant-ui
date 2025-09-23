export type ProviderType = "vercel-ai-sdk" | "assistant-cloud" | "langgraph" | "mcp";

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  description: string;
  apiRoute: string;
  envVars: string[];
}

export const providers: ProviderConfig[] = [
  {
    id: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    description: "OpenAI via Vercel AI SDK",
    apiRoute: "/api/vercel-ai-sdk",
    envVars: ["OPENAI_API_KEY"],
  },
  {
    id: "assistant-cloud",
    name: "Assistant Cloud",
    description: "assistant-ui Cloud Service",
    apiRoute: "/api/assistant-cloud",
    envVars: ["NEXT_PUBLIC_ASSISTANT_BASE_URL"],
  },
  {
    id: "langgraph",
    name: "LangGraph",
    description: "LangChain/LangGraph integration (requires server)",
    apiRoute: "/api/langgraph",
    envVars: ["OPENAI_API_KEY", "LANGCHAIN_API_KEY"],
  },
  {
    id: "mcp",
    name: "MCP",
    description: "Model Context Protocol",
    apiRoute: "/api/mcp",
    envVars: ["MCP_SERVER_URL"],
  },
];