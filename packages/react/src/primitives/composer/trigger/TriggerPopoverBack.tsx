"use client";

import { Primitive } from "../../../utils/Primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
} from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useTriggerPopoverScopeContext } from "./TriggerPopover";

export namespace ComposerPrimitiveTriggerPopoverBack {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

/**
 * A button that navigates back from category items to the category list.
 * Only renders when a category is active (drill-down view).
 */
export const ComposerPrimitiveTriggerPopoverBack = forwardRef<
  ComposerPrimitiveTriggerPopoverBack.Element,
  ComposerPrimitiveTriggerPopoverBack.Props
>(({ onClick, ...props }, forwardedRef) => {
  const { activeCategoryId, isSearchMode, goBack } =
    useTriggerPopoverScopeContext();

  if (!activeCategoryId || isSearchMode) return null;

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, goBack)}
    />
  );
});

ComposerPrimitiveTriggerPopoverBack.displayName =
  "ComposerPrimitive.TriggerPopoverBack";
