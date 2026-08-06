/// <reference path="./scope-registration.ts" />
/// <reference path="../react/types/store-augmentation.ts" />

// scopes
export type {
  ThreadsState,
  ThreadsMethods,
  ThreadsClientSchema,
} from "./scopes/threads";
export type {
  ThreadListItemState,
  ThreadListItemMethods,
  ThreadListItemMeta,
  ThreadListItemEvents,
  ThreadListItemClientSchema,
} from "./scopes/thread-list-item";
export type {
  ThreadState,
  ThreadMethods,
  ThreadMeta,
  ThreadEvents,
  ThreadClientSchema,
} from "./scopes/thread";
export type {
  MessageState,
  MessageMethods,
  MessageMeta,
  MessageClientSchema,
} from "./scopes/message";
export type {
  PartState,
  PartMethods,
  PartMeta,
  PartClientSchema,
} from "./scopes/part";
export type {
  ComposerState,
  ComposerMethods,
  ComposerSendOptions,
  ComposerMeta,
  ComposerEvents,
  ComposerClientSchema,
} from "./scopes/composer";
export type {
  QueueItemState,
  QueueItemMethods,
  QueueItemMeta,
  QueueItemClientSchema,
} from "./scopes/queue-item";
export type {
  AttachmentState,
  AttachmentMethods,
  AttachmentMeta,
  AttachmentClientSchema,
} from "./scopes/attachment";
export type {
  SuggestionsState,
  SuggestionsMethods,
  SuggestionsClientSchema,
  Suggestion,
} from "./scopes/suggestions";
export type {
  SuggestionState,
  SuggestionMethods,
  SuggestionMeta,
  SuggestionClientSchema,
} from "./scopes/suggestion";
export type {
  ModelContextState,
  ModelContextMethods,
  ModelContextClientSchema,
} from "./scopes/model-context";
export type {
  ChainOfThoughtState,
  ChainOfThoughtMethods,
  ChainOfThoughtMeta,
  ChainOfThoughtClientSchema,
  ChainOfThoughtPart,
} from "./scopes/chain-of-thought";

// runtime wiring
export { RuntimeAdapter } from "../react/RuntimeAdapter";
export {
  useExternalMessageConverter,
  convertExternalMessages,
  type JoinStrategy,
} from "../react/runtimes/external-message-converter";
export {
  useStreamingTiming,
  type StreamingTimingAccessors,
  type StreamingTimingOptions,
  type StreamingTimingState,
} from "../react/runtimes/useStreamingTiming";
export {
  createRuntimeExtrasBrand,
  type RuntimeExtrasBrand,
} from "../runtime/utils/runtime-extras-brand";
export { defineToolkit } from "../react/model-context/define-toolkit";
export {
  defineMcpToolkit,
  type McpToolkitDefinition,
  type McpToolkitEntry,
  type McpToolkitToolConfig,
} from "../react/model-context/define-mcp-toolkit";
export type {
  Toolkit,
  ToolkitDefinition,
  ToolkitDefinitionEntry,
} from "../react/model-context/toolbox";

// clients
export { NoOpComposerClient } from "./clients/no-op-composer-client";
export { Suggestions, type SuggestionConfig } from "./clients/suggestions";
export { ChainOfThoughtClient } from "./clients/chain-of-thought-client";
export {
  ThreadMessageClient,
  type ThreadMessageClientProps,
} from "./clients/thread-message-client";
export { ModelContext } from "./clients/model-context-client";
