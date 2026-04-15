"use client";

import { Primitive } from "../../../utils/Primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useCallback,
} from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useTriggerPopoverScopeContext } from "./TriggerPopover";
import type { Unstable_TriggerItem } from "@assistant-ui/core";

export namespace ComposerPrimitiveTriggerPopoverItems {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "children"
  > & {
    children: (items: readonly Unstable_TriggerItem[]) => ReactNode;
  };
}

/**
 * Renders the list of items within a category or search results via a render function.
 * Only renders when a category is active or search mode is on.
 */
export const ComposerPrimitiveTriggerPopoverItems = forwardRef<
  ComposerPrimitiveTriggerPopoverItems.Element,
  ComposerPrimitiveTriggerPopoverItems.Props
>(({ children, "aria-label": ariaLabel, ...props }, forwardedRef) => {
  const { items, activeCategoryId, isSearchMode, open } =
    useTriggerPopoverScopeContext();

  if (!open || (!activeCategoryId && !isSearchMode)) return null;

  return (
    <Primitive.div
      role="group"
      aria-label={ariaLabel ?? "Items"}
      {...props}
      ref={forwardedRef}
    >
      {children(items)}
    </Primitive.div>
  );
});

ComposerPrimitiveTriggerPopoverItems.displayName =
  "ComposerPrimitive.TriggerPopoverItems";

export namespace ComposerPrimitiveTriggerPopoverItem {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button> & {
    item: Unstable_TriggerItem;
    index?: number | undefined;
  };
}

/**
 * A button that selects a trigger item.
 * Automatically receives `data-highlighted` when keyboard-navigated.
 */
export const ComposerPrimitiveTriggerPopoverItem = forwardRef<
  ComposerPrimitiveTriggerPopoverItem.Element,
  ComposerPrimitiveTriggerPopoverItem.Props
>(({ item, index: indexProp, onClick, ...props }, forwardedRef) => {
  const {
    selectItem,
    items,
    highlightedIndex,
    activeCategoryId,
    isSearchMode,
    popoverId,
  } = useTriggerPopoverScopeContext();

  const handleClick = useCallback(() => {
    selectItem(item);
  }, [selectItem, item]);

  const itemIndex = indexProp ?? items.findIndex((i) => i.id === item.id);
  const isHighlighted =
    (isSearchMode || activeCategoryId !== null) &&
    itemIndex === highlightedIndex;

  return (
    <Primitive.button
      type="button"
      role="option"
      id={`${popoverId}-option-${item.id}`}
      aria-selected={isHighlighted}
      data-highlighted={isHighlighted ? "" : undefined}
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

ComposerPrimitiveTriggerPopoverItem.displayName =
  "ComposerPrimitive.TriggerPopoverItem";
