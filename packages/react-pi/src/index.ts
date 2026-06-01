// Browser-safe entry. MUST NOT import `@earendil-works/pi-*` — those live only
// in the `./node` entry.

export * from "./piTypes";

export { createPiThreadState, reducePiThreadState } from "./piThreadState";
export type {
  PiThreadState,
  PiRunStatus,
  PiLoadState,
  PiToolExecutionState,
} from "./piThreadState";

export {
  projectPiThreadMessages,
  projectPiThreadRepository,
} from "./piMessageProjection";
export type {
  PiProjectionInput,
  PiProjectedContentPart,
} from "./piMessageProjection";

export {
  splitHostUiRequests,
  responseForApproval,
  responseForInterrupt,
  responseForRequest,
} from "./piHostUi";
export type { SplitHostUiRequests, PiInterruptAnswer } from "./piHostUi";

export { PiThreadController } from "./PiThreadController";
export type {
  PiThreadControllerLike,
  PiSendOptions,
} from "./PiThreadController";

export {
  usePiRuntime,
  usePiRuntimeExtras,
  usePiSession,
  usePiThreadState,
  usePiHostUiRequests,
} from "./usePiRuntime";
export type { PiRuntimeOptions, PiRuntimeExtras } from "./usePiRuntime";

export { createPiHttpClient } from "./createPiHttpClient";
export type { PiHttpClientOptions } from "./createPiHttpClient";

export { createSseDecoder, openPiEventStream } from "./PiEventSource";
export type { SseFrame, PiEventStreamOptions } from "./PiEventSource";
