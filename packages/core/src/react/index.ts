import "./types/store-augmentation";

export * from "./model-context";
export * from "./client";
export * from "./types";
export * from "./providers";
export { RuntimeAdapter } from "./RuntimeAdapter";

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
