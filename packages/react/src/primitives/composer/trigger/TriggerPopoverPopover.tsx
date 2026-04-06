"use client";

import { Primitive } from "../../../utils/Primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
} from "react";
import { useTriggerPopoverContext } from "./TriggerPopoverContext";

export namespace ComposerPrimitiveTriggerPopoverPopover {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * Renders a container for the trigger popover.
 * Only renders when a trigger character is detected in the composer text.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.Unstable_TriggerPopoverRoot trigger="/" adapter={adapter} onSelect={onSelect}>
 *   <ComposerPrimitive.Input />
 *   <ComposerPrimitive.Unstable_TriggerPopoverPopover>
 *     <ComposerPrimitive.Unstable_TriggerPopoverCategories />
 *   </ComposerPrimitive.Unstable_TriggerPopoverPopover>
 * </ComposerPrimitive.Unstable_TriggerPopoverRoot>
 * ```
 */
export const ComposerPrimitiveTriggerPopoverPopover = forwardRef<
  ComposerPrimitiveTriggerPopoverPopover.Element,
  ComposerPrimitiveTriggerPopoverPopover.Props
>(({ "aria-label": ariaLabel, ...props }, forwardedRef) => {
  const { open, popoverId, highlightedItemId } = useTriggerPopoverContext();
  if (!open) return null;

  return (
    <Primitive.div
      role="listbox"
      id={popoverId}
      aria-label={ariaLabel ?? "Suggestions"}
      aria-activedescendant={highlightedItemId}
      data-state="open"
      {...props}
      ref={forwardedRef}
    />
  );
});

ComposerPrimitiveTriggerPopoverPopover.displayName =
  "ComposerPrimitive.TriggerPopoverPopover";
