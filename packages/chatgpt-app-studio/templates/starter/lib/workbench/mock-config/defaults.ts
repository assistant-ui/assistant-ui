import type { MockVariant, ToolMockConfig } from "./types";

let idCounter = 0;
function generateId(): string {
  return `mock-${Date.now()}-${++idCounter}`;
}

export function createDefaultVariants(toolName: string): MockVariant[] {
  return [
    {
      id: generateId(),
      name: "success",
      type: "success",
      delay: 300,
      response: {
        structuredContent: {
          success: true,
          message: `Mock success response for ${toolName}`,
        },
      },
      conversation: {
        userMessage: `Can you help me with ${formatToolName(toolName)}?`,
        assistantResponse: `Here's what I found. Let me know if you need anything else!`,
      },
    },
    {
      id: generateId(),
      name: "empty",
      type: "empty",
      delay: 200,
      response: {
        structuredContent: {},
      },
      conversation: {
        userMessage: `Search for something that doesn't exist`,
        assistantResponse: `I couldn't find any results for your query.`,
      },
    },
    {
      id: generateId(),
      name: "error",
      type: "error",
      delay: 100,
      response: {
        isError: true,
        content: `Mock error: ${toolName} failed`,
      },
      conversation: {
        userMessage: `Try something that will fail`,
        assistantResponse: `I encountered an error while processing your request. Please try again.`,
      },
    },
    {
      id: generateId(),
      name: "slow",
      type: "slow",
      delay: 3000,
      response: {
        structuredContent: {
          success: true,
          message: `Slow response for ${toolName}`,
        },
      },
      conversation: {
        userMessage: `This might take a while...`,
        assistantResponse: `That took a bit longer than usual, but here are your results!`,
      },
    },
  ];
}

function formatToolName(toolName: string): string {
  return toolName
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

export function createToolMockConfig(toolName: string): ToolMockConfig {
  return {
    toolName,
    source: "mock",
    activeVariantId: null,
    variants: createDefaultVariants(toolName),
    interceptMode: false,
  };
}

export function createEmptyMockConfigState(): {
  tools: Record<string, ToolMockConfig>;
  globalEnabled: boolean;
  serverUrl: string;
} {
  return {
    tools: {},
    globalEnabled: true,
    serverUrl: "http://localhost:3001/mcp",
  };
}
