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

// Voice adapter
export type { RealtimeVoiceAdapter } from "./voice";
export { createVoiceSession } from "./voice";
export type { VoiceSessionControls, VoiceSessionHelpers } from "./voice";

// Feedback adapter
export type { FeedbackAdapter } from "./feedback";

// Suggestion adapter
export type { SuggestionAdapter } from "./suggestion";

// Trigger adapter (generic)
export type { Unstable_TriggerAdapter } from "./trigger";

// Directive formatter
export { unstable_defaultDirectiveFormatter } from "./directive-formatter";

// Thread history adapters
export type {
  ThreadHistoryAdapter,
  GenericThreadHistoryAdapter,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  MessageStorageEntry,
} from "./thread-history";
