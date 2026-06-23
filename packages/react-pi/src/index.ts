// Browser-safe entry. MUST NOT import `@earendil-works/pi-*` — only `src/node/`
// may, and it is reachable only from the `./node` entry.

export * from "./types";
export { piQueueItemId, isPiSteerQueueItemId } from "./queueIds";
export type { PiQueueMode } from "./queueIds";

export {
  createPiThreadState,
  reducePiThreadState,
} from "./runtime/threadState";
export type {
  PiThreadState,
  PiRunStatus,
  PiLoadState,
  PiToolExecutionState,
} from "./runtime/threadState";

export {
  projectPiThreadMessages,
  projectPiThreadRepository,
} from "./runtime/messageProjection";
export type {
  PiProjectionInput,
  PiProjectedContentPart,
} from "./runtime/messageProjection";

export {
  splitHostUiRequests,
  responseForApproval,
  responseForInterrupt,
  responseForRequest,
} from "./runtime/hostUi";
export type { SplitHostUiRequests, PiInterruptAnswer } from "./runtime/hostUi";

export { PiThreadController } from "./runtime/ThreadController";
export type {
  PiThreadControllerLike,
  PiSendOptions,
} from "./runtime/ThreadController";

export { usePiRuntime } from "./runtime/usePiRuntime";
export {
  usePiRuntimeExtras,
  usePiSession,
  usePiThreadState,
  usePiHostUiRequests,
} from "./runtime/hooks";
export type { PiRuntimeOptions, PiRuntimeExtras } from "./runtime/runtimeTypes";

export { createPiHttpClient } from "./client/httpClient";
export type { PiHttpClientOptions } from "./client/httpClient";

export { createSseDecoder, openPiEventStream } from "./client/eventSource";
export type { SseFrame, PiEventStreamOptions } from "./client/eventSource";
