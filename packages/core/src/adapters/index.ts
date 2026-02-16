// Attachment adapters
export type { AttachmentAdapter } from "./attachment";
export {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  CompositeAttachmentAdapter,
} from "./attachment";

// Speech adapters
export type { SpeechSynthesisAdapter, DictationAdapter } from "./speech";
export {
  WebSpeechSynthesisAdapter,
  WebSpeechDictationAdapter,
} from "./speech";

// Feedback adapter
export type { FeedbackAdapter } from "./feedback";

// Suggestion adapter
export type { SuggestionAdapter } from "./suggestion";

// Thread history adapters
export type {
  ThreadHistoryAdapter,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "./thread-history";
