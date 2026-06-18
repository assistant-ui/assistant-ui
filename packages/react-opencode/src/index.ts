export { useOpenCodeRuntime } from "./useOpenCodeRuntime";

export {
  useOpenCodePermissions,
  useOpenCodeQuestions,
  useOpenCodeRuntimeExtras,
  useOpenCodeSession,
  useOpenCodeThreadState,
} from "./hooks";

export { useOpenCodeStreamingTiming } from "./useOpenCodeStreamingTiming";

// Lower-level building blocks, deliberately public as advanced API and
// documented in the docs site's OpenCode "lower-level building blocks" table.
export {
  OpenCodeEventSource,
  STREAM_RECONNECTED_EVENT_TYPE,
} from "./OpenCodeEventSource";
export { OpenCodeThreadController } from "./OpenCodeThreadController";
export {
  createOpenCodeThreadState,
  reduceOpenCodeThreadState,
} from "./openCodeThreadState";
export { projectOpenCodeThreadMessages } from "./openCodeMessageProjection";

export type {
  MessageWithParts,
  OpenCodeLoadState,
  OpenCodePartPayload,
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
  OpenCodeProjectedThreadMessage,
  OpenCodeQuestionRequest,
  OpenCodeRunState,
  OpenCodeRuntime,
  OpenCodeRuntimeExtras,
  OpenCodeRuntimeOptions,
  OpenCodeServerEvent,
  OpenCodeServerMessage,
  OpenCodeStateEvent,
  OpenCodeThreadControllerLike,
  OpenCodeThreadControllerSnapshot,
  OpenCodeThreadState,
  OpenCodeThreadStateSelector,
  OpenCodeUnhandledEvent,
  OpenCodeUserMessageOptions,
  PendingUserMessage,
} from "./types";

export type {
  AssistantMessage,
  Event,
  FilePart,
  GlobalSession,
  Message,
  Model,
  OpencodeClient,
  OpencodeClientConfig,
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
} from "./types";

export { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
