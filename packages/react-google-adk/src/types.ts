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
  | {
      type: "file";
      mimeType: string;
      data: string;
      filename?: string | undefined;
    }
  | {
      type: "file_url";
      url: string;
      mimeType?: string | undefined;
    }
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

export type AdkAuthCredentialType =
  | "apiKey"
  | "http"
  | "oauth2"
  | "openIdConnect"
  | "serviceAccount";

export type AdkAuthCredential = {
  authType: AdkAuthCredentialType;
  resourceRef?: string | undefined;
  apiKey?: string | undefined;
  http?:
    | {
        scheme: string;
        credentials: {
          username?: string;
          password?: string;
          token?: string;
        };
      }
    | undefined;
  oauth2?:
    | {
        clientId?: string;
        clientSecret?: string;
        authUri?: string;
        state?: string;
        redirectUri?: string;
        authResponseUri?: string;
        authCode?: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        expiresIn?: number;
      }
    | undefined;
  serviceAccount?: unknown;
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

// ── RunConfig ──

export type AdkRunConfig = {
  streamingMode?: "none" | "sse" | "bidi" | undefined;
  pauseOnToolCalls?: boolean | undefined;
  maxLlmCalls?: number | undefined;
  saveInputBlobsAsArtifacts?: boolean | undefined;
  supportCfc?: boolean | undefined;
  speechConfig?: unknown;
  responseModalities?: string[] | undefined;
  outputAudioTranscription?: unknown;
  inputAudioTranscription?: unknown;
  enableAffectiveDialog?: boolean | undefined;
  proactivity?: unknown;
  realtimeInputConfig?: unknown;
};

// ── Stream callback types ──

export type AdkSendMessageConfig = {
  /**
   * ADK RunConfig. Typed as `unknown` for compatibility with
   * assistant-ui core's RunConfig type. Use `AdkRunConfig` when
   * constructing configs manually for type safety.
   */
  runConfig?: unknown;
  checkpointId?: string | undefined;
  stateDelta?: Record<string, unknown> | undefined;
};

// ── Structured events ──

export const AdkEventType = {
  THOUGHT: "thought",
  CONTENT: "content",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
  CALL_CODE: "call_code",
  CODE_RESULT: "code_result",
  ERROR: "error",
  ACTIVITY: "activity",
  TOOL_CONFIRMATION: "tool_confirmation",
  FINISHED: "finished",
} as const;

export type AdkStructuredEvent =
  | { type: "thought"; content: string }
  | { type: "content"; content: string }
  | {
      type: "tool_call";
      call: { name: string; id?: string; args: Record<string, unknown> };
    }
  | {
      type: "tool_result";
      result: { name: string; id?: string; response: unknown };
    }
  | { type: "call_code"; code: { code: string; language?: string } }
  | { type: "code_result"; result: { output: string; outcome?: string } }
  | { type: "error"; errorCode?: string; errorMessage?: string }
  | { type: "activity"; message: string }
  | {
      type: "tool_confirmation";
      confirmations: Record<string, unknown>;
    }
  | { type: "finished" };

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
