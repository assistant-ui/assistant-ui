export { ComposerPrimitiveRoot as Root } from "./composer/ComposerRoot";
export { ComposerPrimitiveInput as Input } from "./composer/ComposerInput";
export { ComposerPrimitiveSend as Send } from "./composer/ComposerSend";
export { ComposerPrimitiveCancel as Cancel } from "./composer/ComposerCancel";
export { ComposerPrimitiveAddAttachment as AddAttachment } from "./composer/ComposerAddAttachment";
export { ComposerPrimitiveAttachments as Attachments } from "./composer/ComposerAttachments";
export { ComposerPrimitiveAttachmentByIndex as AttachmentByIndex } from "./composer/ComposerAttachments";
export { ComposerPrimitiveAttachmentDropzone as AttachmentDropzone } from "./composer/ComposerAttachmentDropzone";
export { ComposerPrimitiveDictate as Dictate } from "./composer/ComposerDictate";
export { ComposerPrimitiveStopDictation as StopDictation } from "./composer/ComposerStopDictation";
export { ComposerPrimitiveDictationTranscript as DictationTranscript } from "./composer/ComposerDictationTranscript";
export { ComposerPrimitiveIf as If } from "./composer/ComposerIf";
export { ComposerPrimitiveQuote as Quote } from "./composer/ComposerQuote";
export { ComposerPrimitiveQuoteText as QuoteText } from "./composer/ComposerQuote";
export { ComposerPrimitiveQuoteDismiss as QuoteDismiss } from "./composer/ComposerQuote";
export { ComposerPrimitiveQueue as Queue } from "./composer/ComposerQueue";

// --- Unified Trigger Popover primitives (unstable) ---
// Root + per-trigger declarations + shared sub-primitives. Used for `@` mentions,
// `/` slash commands, and any other trigger-driven popover.
export { ComposerPrimitiveTriggerPopoverRoot as Unstable_TriggerPopoverRoot } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopover as Unstable_TriggerPopover } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategories as Unstable_TriggerPopoverCategories } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategoryItem as Unstable_TriggerPopoverCategoryItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItems as Unstable_TriggerPopoverItems } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItem as Unstable_TriggerPopoverItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverBack as Unstable_TriggerPopoverBack } from "./composer/trigger";
export { useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext } from "./composer/trigger";
export { useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional } from "./composer/trigger";
export { useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext } from "./composer/trigger";
export { useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional } from "./composer/trigger";
export { useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers } from "./composer/trigger";
export { useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional } from "./composer/trigger";
export type { RegisteredTrigger as Unstable_RegisteredTrigger } from "./composer/trigger";
