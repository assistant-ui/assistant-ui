// Core Mastra message types based on Mastra API
export type MastraMessage = {
  id?: string;
  type: "system" | "human" | "assistant" | "tool";
  content: string | MastraContent[];
  timestamp?: string;
  metadata?: Record<string, any>;
  status?: MastraMessageStatus;
};

export type MastraContent =
  | { type: "text"; text: string }
  | { type: "reasoning"; reasoning: string }
  | { type: "tool_call"; tool_call: MastraToolCall }
  | { type: "tool_result"; tool_result: MastraToolResult }
  | { type: "image"; image: MastraImageContent }
  | { type: "file"; file: MastraFileContent };

export type MastraToolCall = {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status?: MastraToolCallStatus;
  result?: any;
  error?: string;
};


export type MastraImageContent = {
  url: string;
  detail?: "low" | "high" | "auto";
  mime_type?: string;
};

export type MastraFileContent = {
  name: string;
  url: string;
  mime_type?: string;
  size?: number;
};

// Message status types for streaming and tool execution
export type MastraMessageStatus =
  | "running"
  | "complete"
  | "incomplete"
  | "requires-action";

export type MastraToolCallStatus =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "complete";

// Streaming configuration types
export type MastraMessagesConfig = {
  maxRetries?: number;
  timeout?: number;
  onError?: (error: Error) => void;
  onMetadata?: (metadata: Record<string, any>) => void;
  onInterrupt?: (interrupt: MastraInterruptState) => void;
  onToolCall?: (toolCall: MastraToolCall) => void;
  onToolResult?: (toolResult: MastraToolResult) => void;
};

export type MastraStreamCallback = (
  messages: MastraMessage[],
  config: MastraMessagesConfig & { abortSignal: AbortSignal },
) => Promise<AsyncGenerator<MastraEvent>> | AsyncGenerator<MastraEvent>;

export type MastraInterruptState = {
  value?: any;
  resumable?: boolean;
  when?: string;
  ns?: string[];
  agentId?: string;
};

// Accumulator configuration
export type MastraStateAccumulatorConfig<TMessage> = {
  initialMessages?: TMessage[];
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  onMessageUpdate?: (message: TMessage) => void;
};

// Memory system types
export interface MastraMemoryConfig {
  storage: 'libsql' | 'postgresql' | 'turso' | 'pinecone' | 'chroma';
  threadId?: string;
  userId?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface MastraMemoryQuery {
  query: string;
  threadId?: string;
  userId?: string;
  filters?: Record<string, any>;
  limit?: number;
  similarityThreshold?: number;
}

export interface MastraMemoryResult {
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  threadId: string;
  timestamp: string;
}

// Workflow system types
export interface MastraWorkflowConfig {
  workflowId: string;
  initialState?: string;
  context?: Record<string, any>;
  onStateChange?: (state: MastraWorkflowState) => void;
  onInterrupt?: (interrupt: MastraWorkflowInterrupt) => void;
}

export interface MastraWorkflowState {
  id: string;
  current: string;
  status: 'running' | 'suspended' | 'completed' | 'error';
  context: Record<string, any>;
  history: MastraWorkflowTransition[];
  interrupt?: MastraWorkflowInterrupt;
  timestamp?: string;
}

export interface MastraWorkflowInterrupt {
  id: string;
  state: string;
  context: Record<string, any>;
  requiresInput: boolean;
  prompt?: string;
  allowedActions?: string[];
}

export interface MastraWorkflowTransition {
  from: string;
  to: string;
  event: string;
  timestamp: string;
}

export interface MastraWorkflowCommand {
  resume?: any;
  transition?: string;
  context?: Record<string, any>;
}

// Advanced tool system types
export interface MastraToolConfig {
  id: string;
  name: string;
  description: string;
  parameters: any; // z.ZodSchema - will import zod in implementation
  execute: MastraToolExecutor;
  timeout?: number;
  retryPolicy?: MastraRetryPolicy;
  status?: 'available' | 'unavailable' | 'executing';
}

export interface MastraToolExecutor {
  (params: any): Promise<MastraToolResult>;
}

export interface MastraToolResult {
  success: boolean;
  data?: any;
  error?: string;
  artifacts?: any[];
  executionTime?: number;
  // Legacy properties for compatibility with existing code
  tool_call_id?: string;
  result?: any;
  status?: MastraToolCallStatus;
}

export interface MastraToolExecution {
  id: string;
  toolId: string;
  parameters: any;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  result?: MastraToolResult;
  progress?: number;
}

export interface MastraRetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelay: number;
}

// Event system types - Basic event handling for streaming
export interface MastraEventHandler {
  (event: MastraEvent): void | Promise<void>;
}

// Event types for streaming
export type MastraEvent = {
  id: string;
  event: MastraKnownEventTypes;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
};

export enum MastraKnownEventTypes {
  // Message events
  Message = "message",
  MessagePartial = "message/partial",
  MessageComplete = "message/complete",

  // Agent lifecycle events
  AgentStarted = "agent/started",
  AgentStopped = "agent/stopped",
  AgentError = "agent/error",
  AgentStatus = "agent/status",

  // Workflow events
  WorkflowStarted = "workflow/started",
  WorkflowSuspended = "workflow/suspended",
  WorkflowResumed = "workflow/resumed",
  WorkflowInterrupt = "workflow/interrupt",
  WorkflowCompleted = "workflow/completed",

  // Tool events
  ToolStarted = "tool/started",
  ToolProgress = "tool/progress",
  ToolCompleted = "tool/completed",
  ToolFailed = "tool/failed",
  ToolCancelled = "tool/cancelled",

  // Memory events
  MemorySaved = "memory/saved",
  MemoryRetrieved = "memory/retrieved",
  MemorySearched = "memory/searched",

  // System events
  Metadata = "metadata",
  Error = "error",
  Custom = "custom",

  // Legacy events for compatibility with existing code
  ToolCall = "tool/call",
  ToolResult = "tool/result",
  ToolCallPartial = "tool/call/partial",
  ToolResultPartial = "tool/result/partial",
  Interrupt = "interrupt"
}

// Runtime configuration
export type MastraRuntimeConfig = {
  agentId: string;
  api: string;
  onError?: (error: Error) => void;
  onSwitchToThread?: (threadId: string) => Promise<MastraThreadState>;
  onSwitchToNewThread?: () => Promise<string>;
  eventHandlers?: {
    onMetadata?: (metadata: Record<string, any>) => void;
    onError?: (error: Error) => void;
    onInterrupt?: (interrupt: MastraInterruptState) => void;
    onCustomEvent?: (event: MastraEvent) => void;
    onToolCall?: (toolCall: MastraToolCall) => void;
    onToolResult?: (toolResult: MastraToolResult) => void;
    onAgentEvent?: (event: MastraEvent) => void;
    onWorkflowEvent?: (event: MastraEvent) => void;
    onMemoryEvent?: (event: MastraEvent) => void;
  };
  adapters?: {
    attachments?: any; // TODO: proper types in Phase 3
    feedback?: any;
    speech?: any;
  };

  // Advanced feature configurations - Real Mastra APIs only
  memory?: MastraMemoryConfig;
  workflow?: MastraWorkflowConfig;

  // Advanced feature callbacks
  onMemoryUpdate?: (threadId: string, memory: MastraMemoryResult[]) => void;

  // Legacy compatibility
  legacyMemory?: boolean; // renamed to avoid conflict with MastraMemoryConfig
  workflows?: string[];
  autoCancelTools?: boolean;
  enableTracing?: boolean;
  enableMetrics?: boolean;
};

// Thread state for conversation persistence
export type MastraThreadState = {
  id: string;
  messages: MastraMessage[];
  interrupts: MastraInterruptState[];
  metadata: Record<string, any>;
  memory?: MastraMemoryResult[];
  createdAt: string;
  updatedAt: string;
};

// Runtime extras for additional functionality
export const MastraRuntimeExtrasSymbol = Symbol("mastra-runtime-extras");

export type MastraRuntimeExtras = {
  agentId: string;
  isStreaming: boolean;
  // Real Mastra feature integrations
  memory?: any; // ReturnType<typeof useMastraMemory>
  workflow?: any; // ReturnType<typeof useMastraWorkflows>
};
