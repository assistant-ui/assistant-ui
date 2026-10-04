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

import {
  ComposerPrimitiveTriggerPopover,
  ComposerPrimitiveTriggerPopoverRoot,
  ComposerPrimitiveTriggerPopoverCategories,
  ComposerPrimitiveTriggerPopoverCategoryItem,
  ComposerPrimitiveTriggerPopoverItems,
  ComposerPrimitiveTriggerPopoverItem,
  ComposerPrimitiveTriggerPopoverBack,
} from "./composer/trigger";
import type { TriggerMatch, TriggerMatcher } from "./composer/trigger";

export { ComposerPrimitiveTriggerPopover as TriggerPopover } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopover` instead. */
export const Unstable_TriggerPopover = ComposerPrimitiveTriggerPopover;
export { ComposerPrimitiveTriggerPopoverRoot as TriggerPopoverRoot } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverRoot` instead. */
export const Unstable_TriggerPopoverRoot = ComposerPrimitiveTriggerPopoverRoot;
export { ComposerPrimitiveTriggerPopoverCategories as TriggerPopoverCategories } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverCategories` instead. */
export const Unstable_TriggerPopoverCategories =
  ComposerPrimitiveTriggerPopoverCategories;
export { ComposerPrimitiveTriggerPopoverCategoryItem as TriggerPopoverCategoryItem } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverCategoryItem` instead. */
export const Unstable_TriggerPopoverCategoryItem =
  ComposerPrimitiveTriggerPopoverCategoryItem;
export { ComposerPrimitiveTriggerPopoverItems as TriggerPopoverItems } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverItems` instead. */
export const Unstable_TriggerPopoverItems =
  ComposerPrimitiveTriggerPopoverItems;
export { ComposerPrimitiveTriggerPopoverItem as TriggerPopoverItem } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverItem` instead. */
export const Unstable_TriggerPopoverItem = ComposerPrimitiveTriggerPopoverItem;
export { ComposerPrimitiveTriggerPopoverBack as TriggerPopoverBack } from "./composer/trigger";
/** @deprecated Use `ComposerPrimitive.TriggerPopoverBack` instead. */
export const Unstable_TriggerPopoverBack = ComposerPrimitiveTriggerPopoverBack;
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
