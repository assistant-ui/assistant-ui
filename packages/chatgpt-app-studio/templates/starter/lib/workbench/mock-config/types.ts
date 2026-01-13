export type MockVariantType = "success" | "empty" | "error" | "slow" | "custom";

export interface MockResponse {
  structuredContent?: Record<string, unknown>;
  content?: string;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

export interface ConversationContext {
  userMessage: string;
  assistantResponse?: string;
}

export interface MockVariant {
  id: string;
  name: string;
  type: MockVariantType;
  response: MockResponse;
  delay: number;
  conversation?: ConversationContext;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
  idempotentHint?: boolean;
}

export interface ToolDescriptorMeta {
  "openai/outputTemplate"?: string;
  "openai/widgetAccessible"?: boolean;
  "openai/visibility"?: "public" | "private";
  "openai/toolInvocation/invoking"?: string;
  "openai/toolInvocation/invoked"?: string;
  "openai/fileParams"?: string[];
}

export interface ToolSchemas {
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export type ToolSource = "mock" | "server";

export interface ToolMockConfig {
  toolName: string;
  source: ToolSource;
  activeVariantId: string | null;
  variants: MockVariant[];
  interceptMode: boolean;
  annotations?: ToolAnnotations;
  descriptorMeta?: ToolDescriptorMeta;
  schemas?: ToolSchemas;
  mockResponse?: MockResponse;
}

export interface MockConfigState {
  tools: Record<string, ToolMockConfig>;
  globalEnabled: boolean;
  serverUrl: string;
}
