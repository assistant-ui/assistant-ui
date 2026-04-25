import "./matchers/augment";

export {
  createHeadlessAdapter,
  Replayer,
  Transcript,
  TRANSCRIPT_VERSION,
  VirtualClock,
  transcript,
  transcriptSchema,
} from "@assistant-ui/chat-test-kit-core";
export type {
  AbortAndRestartInjection,
  AssistantEvent,
  AssistantStreamOptions,
  AssistantStreamTurn,
  AssistantToolCallTurn,
  CancelInjection,
  ContentPart,
  DelayTurn,
  DisconnectInjection,
  Injection,
  InjectionPosition,
  InterruptInjection,
  JsonObject,
  JsonValue,
  MetadataTurn,
  ReplayerOptions,
  ReplayerPhase,
  ReplayerState,
  RuntimeAdapter,
  RuntimeSnapshot,
  TextPart,
  ToolCallPart,
  ToolResultTurn,
  TranscriptType,
  TransportErrorInjection,
  Turn,
  UserTurn,
} from "@assistant-ui/chat-test-kit-core";

export { createChatTestHarness } from "./harness/harness";
export { setupChatTestKit } from "./setup";
export { message, thread, toolCall } from "./matchers/targets";

export type {
  ChatTestHarness,
  HarnessOptions,
  TimelineEntry,
} from "./harness/types";
export type {
  MessageTarget,
  ThreadTarget,
  ToolCallTarget,
} from "./matchers/types";
