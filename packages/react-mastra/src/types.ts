import type {
  AttachmentAdapter,
  DictationAdapter,
  ExternalStoreSharedOptions,
  FeedbackAdapter,
  RealtimeVoiceAdapter,
  SpeechSynthesisAdapter,
} from "@assistant-ui/core";

export type MastraRole = "system" | "human" | "assistant" | "tool";

export type MastraMessage = {
  id?: string;
  type: MastraRole;
  content: string | MastraContent[];
  timestamp?: string;
  metadata?: Record<string, unknown>;
  status?: MastraMessageStatus;
  tool_call_id?: string;
  name?: string;
};

export type MastraContent =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool_call"; tool_call: MastraToolCall }
  | { type: "tool_result"; tool_result: MastraToolResult }
  | { type: "image"; url: string; mimeType?: string }
  | { type: "file"; data: string; mimeType: string; filename?: string }
  | { type: "data"; name: string; data: unknown };

export type MastraToolCall = {
  id: string;
  name: string;
  arguments: Record<string, any>;
  argsText?: string;
  status?: MastraToolCallStatus;
  result?: unknown;
  error?: string;
};

export type MastraToolResult = {
  tool_call_id: string;
  name?: string;
  result?: unknown;
  error?: string;
  status?: MastraToolCallStatus;
};

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

export type MastraInterruptState = {
  value?: unknown;
  resumable?: boolean;
  when?: string;
  ns?: string[];
  agentId?: string;
};

export type MastraSendMessageConfig = {
  abortSignal?: AbortSignal;
  runConfig?: unknown;
  maxRetries?: number;
  timeout?: number;
  threadId?: string;
  resourceId?: string;
};

export type MastraStreamCallback = (
  messages: MastraMessage[],
  config: MastraSendMessageConfig & { abortSignal: AbortSignal },
) => Promise<AsyncIterable<MastraEvent>> | AsyncIterable<MastraEvent>;

export type MastraStateAccumulatorConfig<TMessage> = {
  initialMessages?: TMessage[];
  appendMessage?: (prev: TMessage | undefined, curr: TMessage) => TMessage;
  onMessageUpdate?: (message: TMessage) => void;
};

export interface MastraMemoryConfig {
  apiUrl?: string;
  threadId?: string;
  userId?: string;
  maxResults?: number;
  similarityThreshold?: number;
}

export interface MastraMemoryQuery {
  query: string;
  threadId?: string;
  userId?: string;
  filters?: Record<string, unknown>;
  limit?: number;
  similarityThreshold?: number;
}

export interface MastraMemoryResult {
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  threadId: string;
  timestamp: string;
}

export interface MastraWorkflowConfig {
  workflowId: string;
  apiUrl?: string;
  eventsUrl?: string;
  initialState?: string;
  context?: Record<string, unknown>;
  onStateChange?: (state: MastraWorkflowState) => void;
  onInterrupt?: (interrupt: MastraWorkflowInterrupt) => void;
  onError?: (error: Error) => void;
}

export interface MastraWorkflowState {
  id: string;
  current: string;
  status: "running" | "suspended" | "completed" | "error";
  context: Record<string, unknown>;
  history: MastraWorkflowTransition[];
  interrupt?: MastraWorkflowInterrupt;
  suspendData?: unknown;
  timestamp?: string;
}

export interface MastraWorkflowInterrupt {
  id: string;
  state: string;
  context: Record<string, unknown>;
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
  resume?: unknown;
  transition?: string;
  context?: Record<string, unknown>;
}

export interface MastraEventHandler {
  (event: MastraEvent): void | Promise<void>;
}

export type MastraEvent = {
  id?: string;
  event: MastraKnownEventTypes | string;
  data: unknown;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export enum MastraKnownEventTypes {
  Message = "message",
  MessagePartial = "message/partial",
  MessageComplete = "message/complete",
  Metadata = "metadata",
  Error = "error",
  Custom = "custom",
  ToolCall = "tool/call",
  ToolResult = "tool/result",
  ToolCallPartial = "tool/call/partial",
  ToolResultPartial = "tool/result/partial",
  Interrupt = "interrupt",
  WorkflowStarted = "workflow/started",
  WorkflowSuspended = "workflow/suspended",
  WorkflowResumed = "workflow/resumed",
  WorkflowCompleted = "workflow/completed",
}

export type MastraRuntimeConfig = ExternalStoreSharedOptions & {
  agentId: string;
  api?: string;
  stream?: MastraStreamCallback;
  onError?: (error: Error) => void;
  eventHandlers?: {
    onMetadata?: (metadata: Record<string, unknown>) => void;
    onError?: (error: Error) => void;
    onInterrupt?: (interrupt: MastraInterruptState) => void;
    onCustomEvent?: (event: MastraEvent) => void;
    onToolCall?: (toolCall: MastraToolCall) => void;
    onToolResult?: (toolResult: MastraToolResult) => void;
  };
  adapters?:
    | {
        attachments?: AttachmentAdapter;
        speech?: SpeechSynthesisAdapter;
        dictation?: DictationAdapter;
        voice?: RealtimeVoiceAdapter;
        feedback?: FeedbackAdapter;
      }
    | undefined;
  memory?: MastraMemoryConfig | false;
  workflow?: MastraWorkflowConfig | false;
  autoCancelTools?: boolean;
  unstable_allowCancellation?: boolean;
};

export type MastraThreadState = {
  id: string;
  messages: MastraMessage[];
  interrupts: MastraInterruptState[];
  metadata: Record<string, unknown>;
  memory?: MastraMemoryResult[];
  createdAt: string;
  updatedAt: string;
};

export type MastraRuntimeExtras = {
  agentId: string;
  isStreaming: boolean;
  interrupt: MastraInterruptState | undefined;
  memory?: ReturnType<typeof import("./useMastraMemory").useMastraMemory>;
  workflow?: ReturnType<
    typeof import("./useMastraWorkflows").useMastraWorkflows
  >;
};
