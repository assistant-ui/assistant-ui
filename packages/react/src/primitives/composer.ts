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
export { ComposerPrimitiveMentionRoot as Unstable_MentionRoot } from "./composer/mention";
export { ComposerPrimitiveMentionPopover as Unstable_MentionPopover } from "./composer/mention";
export { ComposerPrimitiveMentionCategories as Unstable_MentionCategories } from "./composer/mention";
export { ComposerPrimitiveMentionCategoryItem as Unstable_MentionCategoryItem } from "./composer/mention";
export { ComposerPrimitiveMentionItems as Unstable_MentionItems } from "./composer/mention";
export { ComposerPrimitiveMentionItem as Unstable_MentionItem } from "./composer/mention";
export { ComposerPrimitiveMentionBack as Unstable_MentionBack } from "./composer/mention";
export { useMentionContext as unstable_useMentionContext } from "./composer/mention";
export { useMentionContextOptional as unstable_useMentionContextOptional } from "./composer/mention";

// --- Generic Trigger Popover primitives (unstable) ---
export { ComposerPrimitiveTriggerPopoverRoot as Unstable_TriggerPopoverRoot } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverPopover as Unstable_TriggerPopoverPopover } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategories as Unstable_TriggerPopoverCategories } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategoryItem as Unstable_TriggerPopoverCategoryItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItems as Unstable_TriggerPopoverItems } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItem as Unstable_TriggerPopoverItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverBack as Unstable_TriggerPopoverBack } from "./composer/trigger";
export { useTriggerPopoverContext as unstable_useTriggerPopoverContext } from "./composer/trigger";
export { useTriggerPopoverContextOptional as unstable_useTriggerPopoverContextOptional } from "./composer/trigger";

// --- Slash Command primitives (unstable) ---
// SlashCommandRoot is the only slash-specific primitive; UI primitives
// (Popover, Items, Categories, Back) are the shared TriggerPopover* set above.
export { ComposerPrimitiveSlashCommandRoot as Unstable_SlashCommandRoot } from "./composer/slash-command";
