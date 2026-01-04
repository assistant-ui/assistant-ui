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
    },
    {
      id: generateId(),
      name: "empty",
      type: "empty",
      delay: 200,
      response: {
        structuredContent: {},
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
    },
  ];
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
