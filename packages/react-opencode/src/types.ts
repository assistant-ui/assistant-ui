import type {
  AppendMessage,
  AssistantRuntime,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import type {
  Message,
  OpencodeClient,
  Part,
  PermissionRequest,
  QuestionAnswer,
  QuestionRequest,
  Session,
  SessionStatus,
} from "@opencode-ai/sdk/v2/client";

export type {
  AssistantMessage,
  Event,
  EventMessagePartDelta,
  FilePart,
  GlobalSession,
  Message,
  Model,
  Part,
  PermissionRequest,
  Provider,
  QuestionAnswer,
  QuestionRequest,
  ReasoningPart,
  Session,
  SessionStatus,
  SnapshotPart,
  StepFinishPart,
  StepStartPart,
  TextPart,
  ToolPart,
  ToolState,
  UserMessage,
} from "@opencode-ai/sdk/v2/client";

export type {
  OpencodeClient,
  OpencodeClientConfig,
} from "@opencode-ai/sdk/v2/client";

export type MessageWithParts = {
  info: Message;
  parts: Part[];
};

export type OpenCodePermissionResponse = "once" | "always" | "reject";

export type OpenCodePermissionRequest = {
  id: string;
  sessionId: string;
  permission: string;
  patterns: readonly string[];
  metadata: Record<string, unknown>;
  always: readonly string[];
  tool?: PermissionRequest["tool"] | undefined;
  toolName?: string | undefined;
  toolInput?: unknown;
  title?: string | undefined;
  askedAt: number;
  raw: PermissionRequest;
};

export type OpenCodeQuestionRequest = QuestionRequest & {
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
  info: Message | undefined;
  parts: readonly Part[];
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

export type OpenCodeUnhandledEvent = {
  type: string;
  sessionId: string | undefined;
  properties: Record<string, unknown>;
  seenAt: number;
};

export type OpenCodeThreadState = {
  sessionId: string;
  session: Session | null;
  sessionStatus: SessionStatus | null;
  loadState: OpenCodeLoadState;
  runState: OpenCodeRunState;
  messageOrder: readonly string[];
  messagesById: Readonly<Record<string, OpenCodeServerMessage>>;
  pendingUserMessages: Readonly<Record<string, PendingUserMessage>>;
  interactions: {
    permissions: {
      pending: Readonly<Record<string, OpenCodePermissionRequest>>;
      resolved: Readonly<
        Record<
          string,
          {
            request: OpenCodePermissionRequest;
            reply: OpenCodePermissionResponse;
            respondedAt: number;
          }
        >
      >;
    };
    questions: {
      pending: Readonly<Record<string, OpenCodeQuestionRequest>>;
      answered: Readonly<
        Record<
          string,
          {
            request: OpenCodeQuestionRequest;
            answers: readonly QuestionAnswer[];
            respondedAt: number;
          }
        >
      >;
      rejected: Readonly<
        Record<
          string,
          {
            request: OpenCodeQuestionRequest;
            rejectedAt: number;
          }
        >
      >;
    };
  };
  unhandledEvents: readonly OpenCodeUnhandledEvent[];
  sync: {
    lastHistoryLoadAt?: number;
    lastEventAt?: number;
    lastCompactionAt?: number;
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
  session: Session | null;
  state: OpenCodeThreadState;
  permissions: OpenCodeThreadState["interactions"]["permissions"]["pending"];
  questions: OpenCodeThreadState["interactions"]["questions"]["pending"];
  fork: (messageId: string) => Promise<string>;
  revert: (messageId: string) => Promise<void>;
  unrevert: () => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  replyToPermission: (
    permissionId: string,
    response: OpenCodePermissionResponse,
  ) => Promise<void>;
  replyToQuestion: (
    questionId: string,
    answers: readonly QuestionAnswer[],
  ) => Promise<void>;
  rejectQuestion: (questionId: string) => Promise<void>;
};

export type OpenCodeRuntime = AssistantRuntime;

export type OpenCodeThreadStateSelector<T> = (state: OpenCodeThreadState) => T;

export type OpenCodeServerEvent = {
  type: string;
  sessionId: string | undefined;
  raw: unknown;
  properties: Record<string, unknown>;
};

export type OpenCodeStateEvent =
  | {
      type: "history.loading";
    }
  | {
      type: "history.loaded";
      session: Session | null;
      messages: readonly MessageWithParts[];
    }
  | { type: "history.failed"; error: unknown }
  | { type: "session.updated"; session: Session }
  | { type: "session.status"; status: SessionStatus }
  | { type: "session.idle"; sessionId: string }
  | { type: "session.compacted"; sessionId: string }
  | { type: "run.started" }
  | { type: "run.cancelling" }
  | { type: "run.reverting" }
  | { type: "run.failed"; error: unknown }
  | { type: "message.updated"; info: Message }
  | { type: "message.removed"; messageId: string }
  | {
      type: "part.updated";
      messageId: string;
      part: Part;
    }
  | {
      type: "part.delta";
      messageId: string;
      partId: string;
      field: string;
      delta: string;
    }
  | { type: "part.removed"; messageId: string; partId: string }
  | { type: "permission.asked"; request: OpenCodePermissionRequest }
  | {
      type: "permission.replied";
      permissionId: string;
      reply: OpenCodePermissionResponse;
    }
  | { type: "question.asked"; request: OpenCodeQuestionRequest }
  | {
      type: "question.replied";
      questionId: string;
      answers: readonly QuestionAnswer[];
    }
  | { type: "question.rejected"; questionId: string }
  | { type: "unhandled.event"; event: OpenCodeUnhandledEvent }
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
  replyToQuestion(
    questionId: string,
    answers: readonly QuestionAnswer[],
  ): Promise<void>;
  rejectQuestion(questionId: string): Promise<void>;
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
