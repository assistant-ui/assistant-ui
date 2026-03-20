import type {
  AppendMessage,
  AssistantRuntime,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import type { OpencodeClient } from "@opencode-ai/sdk/client";

export type {
  AssistantMessage,
  FilePart,
  Message,
  Model,
  Part,
  Provider,
  ReasoningPart,
  Session,
  SnapshotPart,
  StepFinishPart,
  StepStartPart,
  TextPart,
  ToolPart,
  ToolState,
  UserMessage,
} from "@opencode-ai/sdk/client";

export type {
  OpencodeClient,
  OpencodeClientConfig,
} from "@opencode-ai/sdk/client";

export type MessageWithParts = {
  info: import("@opencode-ai/sdk").Message;
  parts: import("@opencode-ai/sdk").Part[];
};

export type OpenCodePermissionResponse = "once" | "always" | "reject";

export type OpenCodePermissionRequest = {
  id: string;
  sessionId: string;
  toolName?: string | undefined;
  toolInput?: unknown;
  title?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  askedAt: number;
};

export type PendingUserMessage = {
  clientId: string;
  sessionId: string;
  createdAt: number;
  parentId: string | null;
  sourceId: string | null;
  runConfig: unknown;
  contentText: string;
  parts: readonly ThreadUserMessagePart[];
  status: "pending" | "failed";
  error?: unknown;
};

export type OpenCodeServerMessage = {
  id: string;
  info: import("@opencode-ai/sdk").Message | undefined;
  parts: readonly import("@opencode-ai/sdk").Part[];
  shadowParts: readonly ThreadUserMessagePart[] | undefined;
};

export type OpenCodeLoadState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "ready" }
  | { type: "error"; error: unknown };

export type OpenCodeRunState =
  | { type: "idle" }
  | { type: "streaming" }
  | { type: "cancelling" }
  | { type: "reverting" }
  | { type: "error"; error: unknown };

export type OpenCodeThreadState = {
  sessionId: string;
  session: import("@opencode-ai/sdk").Session | null;
  loadState: OpenCodeLoadState;
  runState: OpenCodeRunState;
  messageOrder: readonly string[];
  messagesById: Readonly<Record<string, OpenCodeServerMessage>>;
  pendingUserMessages: Readonly<Record<string, PendingUserMessage>>;
  permissions: {
    pending: Readonly<Record<string, OpenCodePermissionRequest>>;
    resolved: Readonly<
      Record<
        string,
        {
          approved: boolean;
          respondedAt: number;
        }
      >
    >;
  };
  sync: {
    lastHistoryLoadAt?: number;
    lastEventAt?: number;
  };
};

export type OpenCodeUserMessageOptions = {
  model?:
    | {
        providerID: string;
        modelID: string;
      }
    | undefined;
  agent?: string | undefined;
  noReply?: boolean | undefined;
};

export type OpenCodeRuntimeOptions = {
  client?: OpencodeClient;
  baseUrl?: string | undefined;
  initialSessionId?: string | undefined;
  defaultModel?:
    | {
        providerID: string;
        modelID: string;
      }
    | undefined;
  defaultAgent?: string | undefined;
  onError?: (error: unknown) => void;
};

export type OpenCodeRuntimeExtras = {
  session: import("@opencode-ai/sdk").Session | null;
  state: OpenCodeThreadState;
  permissions: OpenCodeThreadState["permissions"]["pending"];
  fork: (messageId: string) => Promise<string>;
  revert: (messageId: string) => Promise<void>;
  unrevert: () => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  replyToPermission: (
    permissionId: string,
    response: OpenCodePermissionResponse,
  ) => Promise<void>;
};

export type OpenCodeRuntime = AssistantRuntime;

export type OpenCodeThreadStateSelector<T> = (
  state: OpenCodeThreadState,
) => T;

export type OpenCodeServerEvent = {
  type: string;
  properties: Record<string, unknown>;
  sessionId: string | undefined;
};

export type OpenCodeStateEvent =
  | {
      type: "history.loading";
    }
  | {
      type: "history.loaded";
      session: import("@opencode-ai/sdk").Session | null;
      messages: readonly MessageWithParts[];
    }
  | { type: "history.failed"; error: unknown }
  | { type: "session.updated"; session: import("@opencode-ai/sdk").Session }
  | { type: "session.idle"; sessionId: string }
  | { type: "run.started" }
  | { type: "run.cancelling" }
  | { type: "run.reverting" }
  | { type: "run.failed"; error: unknown }
  | { type: "message.updated"; info: import("@opencode-ai/sdk").Message }
  | { type: "message.removed"; messageId: string }
  | {
      type: "part.updated";
      messageId: string;
      part: import("@opencode-ai/sdk").Part;
    }
  | { type: "part.removed"; messageId: string; partId: string }
  | { type: "permission.asked"; request: OpenCodePermissionRequest }
  | {
      type: "permission.replied";
      permissionId: string;
      approved: boolean;
    }
  | { type: "local.message.queued"; pending: PendingUserMessage }
  | {
      type: "local.message.reconciled";
      clientId: string;
      messageId: string;
    }
  | { type: "local.message.failed"; clientId: string; error: unknown };

export type OpenCodeThreadControllerSnapshot = OpenCodeThreadState;

export type OpenCodeThreadControllerLike = {
  getState(): OpenCodeThreadControllerSnapshot;
  subscribe(listener: () => void): () => void;
  load(force?: boolean): Promise<void>;
  refresh(): Promise<void>;
  sendMessage(
    message: AppendMessage,
    options?: OpenCodeUserMessageOptions,
  ): Promise<void>;
  cancel(): Promise<void>;
  revert(messageId: string): Promise<void>;
  unrevert(): Promise<void>;
  fork(messageId: string): Promise<string>;
  replyToPermission(
    permissionId: string,
    response: OpenCodePermissionResponse,
  ): Promise<void>;
};

export type OpenCodePartPayload = {
  readonly name: string;
  readonly data: Record<string, unknown>;
};

export type OpenCodeProjectedThreadMessage = ThreadMessageLike;

export type {
  AppendMessage,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
