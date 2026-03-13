/// <reference path="./types/store-augmentation.ts" />

export * from "./model-context";
export * from "./client";
export * from "./types";
export * from "./providers";
export { RuntimeAdapter } from "./RuntimeAdapter";
export * from "./runtimes";

// AssistantProvider base
export {
  AssistantProviderBase,
  getRenderComponent,
  type AssistantProviderBaseProps,
} from "./AssistantProvider";

// Shared primitives
export {
  ThreadPrimitiveMessages,
  ThreadPrimitiveMessagesImpl,
  ThreadPrimitiveMessageByIndex,
} from "./primitives/thread/ThreadMessages";
export {
  MessagePrimitiveParts,
  MessagePartComponent,
  MessagePrimitivePartByIndex,
  defaultComponents as messagePartsDefaultComponents,
} from "./primitives/message/MessageParts";
export {
  MessagePrimitiveAttachments,
  MessagePrimitiveAttachmentByIndex,
} from "./primitives/message/MessageAttachments";
export {
  ComposerPrimitiveAttachments,
  ComposerPrimitiveAttachmentByIndex,
} from "./primitives/composer/ComposerAttachments";
export {
  ThreadListPrimitiveItems,
  ThreadListPrimitiveItemByIndex,
} from "./primitives/threadList/ThreadListItems";
export { ChainOfThoughtPrimitiveParts } from "./primitives/chainOfThought/ChainOfThoughtParts";
export {
  PartPrimitiveMessages,
  PartPrimitiveMessagesImpl,
} from "./primitives/part/PartMessages";
export { ThreadListItemPrimitiveTitle } from "./primitives/threadListItem/ThreadListItemTitle";
export {
  ThreadPrimitiveSuggestions,
  ThreadPrimitiveSuggestionsImpl,
  ThreadPrimitiveSuggestionByIndex,
} from "./primitives/thread/ThreadSuggestions";
export {
  ComposerPrimitiveIf,
  type UseComposerIfProps,
} from "./primitives/composer/ComposerIf";
export { getMessageQuote } from "./utils/getMessageQuote";

// Primitive hooks (shared behavior logic)
export * from "./primitive-hooks";

// Shared AssistantRuntimeProvider
export { AssistantRuntimeProvider } from "./AssistantRuntimeProvider";

// Shared runtimes
export {
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "./runtimes/useLocalRuntime";
