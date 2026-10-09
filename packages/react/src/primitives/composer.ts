import type { TriggerMatch, TriggerMatcher } from "./composer/trigger";

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

export { ComposerPrimitiveTriggerPopover as TriggerPopover } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopover` instead. */
  ComposerPrimitiveTriggerPopover as Unstable_TriggerPopover,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverRoot as TriggerPopoverRoot } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverRoot` instead. */
  ComposerPrimitiveTriggerPopoverRoot as Unstable_TriggerPopoverRoot,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategories as TriggerPopoverCategories } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverCategories` instead. */
  ComposerPrimitiveTriggerPopoverCategories as Unstable_TriggerPopoverCategories,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverCategoryItem as TriggerPopoverCategoryItem } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverCategoryItem` instead. */
  ComposerPrimitiveTriggerPopoverCategoryItem as Unstable_TriggerPopoverCategoryItem,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItems as TriggerPopoverItems } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverItems` instead. */
  ComposerPrimitiveTriggerPopoverItems as Unstable_TriggerPopoverItems,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverItem as TriggerPopoverItem } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverItem` instead. */
  ComposerPrimitiveTriggerPopoverItem as Unstable_TriggerPopoverItem,
} from "./composer/trigger";
export { ComposerPrimitiveTriggerPopoverBack as TriggerPopoverBack } from "./composer/trigger";
export {
  /** @deprecated Use `ComposerPrimitive.TriggerPopoverBack` instead. */
  ComposerPrimitiveTriggerPopoverBack as Unstable_TriggerPopoverBack,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverRootContext as unstable_useTriggerPopoverRootContext,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverRootContextOptional as unstable_useTriggerPopoverRootContextOptional,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverScopeContext as unstable_useTriggerPopoverScopeContext,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverScopeContextOptional as unstable_useTriggerPopoverScopeContextOptional,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverTriggers as unstable_useTriggerPopoverTriggers,
} from "./composer/trigger";
export {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  useTriggerPopoverTriggersOptional as unstable_useTriggerPopoverTriggersOptional,
} from "./composer/trigger";
export type {
  /** @deprecated Experimental since 2026-04-15. Not scheduled for removal; the API may change in any release. */
  RegisteredTrigger as Unstable_RegisteredTrigger,
} from "./composer/trigger";
export type { TriggerMatch, TriggerMatcher } from "./composer/trigger";
/** @deprecated Use `TriggerMatcher` instead. */
export type Unstable_TriggerMatcher = TriggerMatcher;
/** @deprecated Use `TriggerMatch` instead. */
export type Unstable_TriggerMatch = TriggerMatch;
