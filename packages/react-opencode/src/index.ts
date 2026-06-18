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
  OpenCodePermissionRequest,
  OpenCodePermissionResponse,
  OpenCodeQuestionRequest,
  OpenCodeRuntime,
  OpenCodeRuntimeExtras,
  OpenCodeRuntimeOptions,
  OpenCodeThreadState,
  QuestionAnswer,
} from "./types";

export { createOpencodeClient } from "@opencode-ai/sdk/v2/client";
