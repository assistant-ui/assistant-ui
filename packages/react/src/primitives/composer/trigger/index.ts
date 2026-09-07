export {
  ComposerPrimitiveTriggerPopoverRoot,
  useTriggerPopoverRootContext,
  useTriggerPopoverRootContextOptional,
  useTriggerPopoverTriggers,
  useTriggerPopoverTriggersOptional,
  type RegisteredTrigger,
  type TriggerPopoverRootContextValue,
} from "./TriggerPopoverRootContext";
export {
  useTriggerPopoverScopeContext,
  useTriggerPopoverScopeContextOptional,
} from "./TriggerPopover";
export {
  ComposerPrimitiveTriggerPopoverCategories,
  ComposerPrimitiveTriggerPopoverCategoryItem,
} from "./TriggerPopoverCategories";
export {
  ComposerPrimitiveTriggerPopoverItems,
  ComposerPrimitiveTriggerPopoverItem,
} from "./TriggerPopoverItems";
export { ComposerPrimitiveTriggerPopoverBack } from "./TriggerPopoverBack";
export type { TriggerBehavior } from "./triggerSelectionResource";
export type { TriggerMatch, TriggerMatcher } from "./detectTrigger";

import { ComposerPrimitiveTriggerPopover as Base } from "./TriggerPopover";
import { ComposerPrimitiveTriggerPopoverAction } from "./TriggerPopoverAction";
import { ComposerPrimitiveTriggerPopoverDirective } from "./TriggerPopoverDirective";

/**
 * @deprecated Experimental since 2026-04-06, extended 2027-06-05. Not scheduled for removal; the API may change in any release.
 */
export const ComposerPrimitiveTriggerPopover = Object.assign(Base, {
  Directive: ComposerPrimitiveTriggerPopoverDirective,
  Action: ComposerPrimitiveTriggerPopoverAction,
});
