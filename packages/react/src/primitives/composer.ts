import type { TriggerMatch, TriggerMatcher } from "./composer/trigger";

export { ComposerPrimitiveRoot as Root } from "./composer/ComposerRoot";
export { ComposerPrimitiveInput as Input } from "./composer/ComposerInput";
export { ComposerPrimitiveSend as Send } from "./composer/ComposerSend";
export { ComposerPrimitiveResume as Resume } from "./composer/ComposerResume";
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

export { ComposerPrimitiveTriggerPopover as TriggerPopover } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopover` instead. */
export { ComposerPrimitiveTriggerPopover as Unstable_TriggerPopover } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverRoot as TriggerPopoverRoot } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverRoot` instead. */
export { ComposerPrimitiveTriggerPopoverRoot as Unstable_TriggerPopoverRoot } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategories as TriggerPopoverCategories } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverCategories` instead. */
export { ComposerPrimitiveTriggerPopoverCategories as Unstable_TriggerPopoverCategories } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategoryItem as TriggerPopoverCategoryItem } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverCategoryItem` instead. */
export { ComposerPrimitiveTriggerPopoverCategoryItem as Unstable_TriggerPopoverCategoryItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItems as TriggerPopoverItems } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverItems` instead. */
export { ComposerPrimitiveTriggerPopoverItems as Unstable_TriggerPopoverItems } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItem as TriggerPopoverItem } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverItem` instead. */
export { ComposerPrimitiveTriggerPopoverItem as Unstable_TriggerPopoverItem } from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverBack as TriggerPopoverBack } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverBack` instead. */
export { ComposerPrimitiveTriggerPopoverBack as Unstable_TriggerPopoverBack } from "./composer/trigger";
export { useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext } from "./composer/trigger";
export { useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional } from "./composer/trigger";
export { useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext } from "./composer/trigger";
export { useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional } from "./composer/trigger";
export { useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers } from "./composer/trigger";
export { useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional } from "./composer/trigger";
export type { RegisteredTrigger as Unstable_RegisteredTrigger } from "./composer/trigger";
export type { TriggerMatch, TriggerMatcher } from "./composer/trigger";
/** @deprecated Use `TriggerMatcher` instead. */
export type Unstable_TriggerMatcher = TriggerMatcher;
/** @deprecated Use `TriggerMatch` instead. */
export type Unstable_TriggerMatch = TriggerMatch;
