import type { MessageStatus } from "@assistant-ui/core";
import type { ReadonlyJSONObject } from "assistant-stream/utils";

// ── ADK Event wire types (lightweight, no @google/adk dependency) ──

export type AdkEventPart = {
  text?: string;
  thought?: boolean;
  functionCall?: {
    name: string;
    id?: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    id?: string;
    response: unknown;
  };
  executableCode?: {
    code: string;
    language?: string;
  };
  codeExecutionResult?: {
    output: string;
    outcome?: string;
  };
  inlineData?: {
    mimeType: string;
    data: string;
  };
  fileData?: {
    fileUri: string;
    mimeType?: string;
  };
};

export type AdkEventActions = {
  stateDelta?: Record<string, unknown> | undefined;
  artifactDelta?: Record<string, number> | undefined;
  transferToAgent?: string | undefined;
  escalate?: boolean | undefined;
  skipSummarization?: boolean | undefined;
  requestedAuthConfigs?: Record<string, unknown> | undefined;
  requestedToolConfirmations?: Record<string, unknown> | undefined;
};

export type AdkEvent = {
  id: string;
  invocationId?: string | undefined;
  author?: string | undefined;
  branch?: string | undefined;
  partial?: boolean | undefined;
  turnComplete?: boolean | undefined;
  interrupted?: boolean | undefined;
  finishReason?: string | undefined;
  timestamp?: number | undefined;
  content?:
    | {
        role?: string | undefined;
        parts?: AdkEventPart[] | undefined;
      }
    | undefined;
  actions?: AdkEventActions | undefined;
  longRunningToolIds?: string[] | undefined;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
  customMetadata?: Record<string, unknown> | undefined;
};

// ── ADK Message types (accumulated from events) ──

export type AdkToolCall = {
  id: string;
  name: string;
  args: ReadonlyJSONObject;
  argsText?: string;
};

export type AdkMessage =
  | {
      id: string;
      type: "human";
      content: string | AdkMessageContentPart[];
    }
  | {
      id: string;
      type: "ai";
      content: string | AdkMessageContentPart[];
      tool_calls?: AdkToolCall[] | undefined;
      author?: string | undefined;
      branch?: string | undefined;
      status?: MessageStatus | undefined;
    }
  | {
      id: string;
      type: "tool";
      content: string;
      tool_call_id: string;
      name: string;
      status?: "success" | "error" | undefined;
      artifact?: unknown;
    };

export type AdkMessageContentPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "image"; mimeType: string; data: string }
  | { type: "image_url"; url: string }
  | { type: "code"; code: string; language: string }
  | { type: "code_result"; output: string; outcome: string }
  | { type: "activity"; message: string };

// ── ADK-specific state types ──

export type AdkToolConfirmation = {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  hint: string;
  confirmed: boolean;
  payload?: unknown;
};

export type AdkAuthRequest = {
  toolCallId: string;
  authConfig: unknown;
};

export type AdkMessageMetadata = {
  groundingMetadata?: unknown;
  citationMetadata?: unknown;
  usageMetadata?: unknown;
};

// ── Stream callback types ──

export type AdkSendMessageConfig = {
  runConfig?: unknown;
  checkpointId?: string | undefined;
};

export type AdkStreamCallback = (
  messages: AdkMessage[],
  config: AdkSendMessageConfig & {
    abortSignal: AbortSignal;
    initialize: () => Promise<{
      remoteId: string;
      externalId: string | undefined;
    }>;
  },
) => Promise<AsyncGenerator<AdkEvent>> | AsyncGenerator<AdkEvent>;

// ── Event handler callbacks ──

export type OnAdkErrorCallback = (error: unknown) => void | Promise<void>;

export type OnAdkCustomEventCallback = (
  type: string,
  data: unknown,
) => void | Promise<void>;

export type OnAdkAgentTransferCallback = (
  toAgent: string,
) => void | Promise<void>;
