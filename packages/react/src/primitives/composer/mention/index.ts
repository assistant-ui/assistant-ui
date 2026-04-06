export {
  ComposerPrimitiveMentionRoot,
  useMentionContext,
  useMentionContextOptional,
  useMentionInternalContext,
} from "./ComposerMentionContext";

// UI primitives — re-exported from the shared trigger popover implementation.
// MentionRoot internally renders TriggerPopoverRoot, so these work within it.
export { ComposerPrimitiveTriggerPopoverPopover as ComposerPrimitiveMentionPopover } from "../trigger/TriggerPopoverPopover";
export {
  ComposerPrimitiveTriggerPopoverCategories as ComposerPrimitiveMentionCategories,
  ComposerPrimitiveTriggerPopoverCategoryItem as ComposerPrimitiveMentionCategoryItem,
} from "../trigger/TriggerPopoverCategories";
export {
  ComposerPrimitiveTriggerPopoverItems as ComposerPrimitiveMentionItems,
  ComposerPrimitiveTriggerPopoverItem as ComposerPrimitiveMentionItem,
} from "../trigger/TriggerPopoverItems";
export { ComposerPrimitiveTriggerPopoverBack as ComposerPrimitiveMentionBack } from "../trigger/TriggerPopoverBack";
