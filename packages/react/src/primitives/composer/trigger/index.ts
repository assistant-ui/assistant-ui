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

import { ComposerPrimitiveTriggerPopover as Base } from "./TriggerPopover";
import { ComposerPrimitiveTriggerPopoverAction } from "./TriggerPopoverAction";
import { ComposerPrimitiveTriggerPopoverDirective } from "./TriggerPopoverDirective";

export const ComposerPrimitiveTriggerPopover = Object.assign(Base, {
  Directive: ComposerPrimitiveTriggerPopoverDirective,
  Action: ComposerPrimitiveTriggerPopoverAction,
});
