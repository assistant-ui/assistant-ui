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
import type { Unstable_TriggerCategory } from "@assistant-ui/core";

export namespace ComposerPrimitiveTriggerPopoverCategories {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "children"
  > & {
    children: (categories: readonly Unstable_TriggerCategory[]) => ReactNode;
  };
}

/**
 * Renders the top-level category list via a render function.
 * Only renders when no category is active and search mode is off.
 */
export const ComposerPrimitiveTriggerPopoverCategories = forwardRef<
  ComposerPrimitiveTriggerPopoverCategories.Element,
  ComposerPrimitiveTriggerPopoverCategories.Props
>(({ children, "aria-label": ariaLabel, ...props }, forwardedRef) => {
  const { categories, activeCategoryId, isSearchMode, open } =
    useTriggerPopoverScopeContext();

  if (!open || activeCategoryId || isSearchMode) return null;

  return (
    <Primitive.div
      role="group"
      aria-label={ariaLabel ?? "Categories"}
      {...props}
      ref={forwardedRef}
    >
      {children(categories)}
    </Primitive.div>
  );
});

ComposerPrimitiveTriggerPopoverCategories.displayName =
  "ComposerPrimitive.TriggerPopoverCategories";

export namespace ComposerPrimitiveTriggerPopoverCategoryItem {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button> & {
    categoryId: string;
  };
}

/**
 * A button that selects a category and triggers drill-down navigation.
 * Automatically receives `data-highlighted` when keyboard-navigated.
 */
export const ComposerPrimitiveTriggerPopoverCategoryItem = forwardRef<
  ComposerPrimitiveTriggerPopoverCategoryItem.Element,
  ComposerPrimitiveTriggerPopoverCategoryItem.Props
>(({ categoryId, onClick, ...props }, forwardedRef) => {
  const {
    selectCategory,
    categories,
    highlightedIndex,
    activeCategoryId,
    isSearchMode,
    popoverId,
  } = useTriggerPopoverScopeContext();

  const handleClick = useCallback(() => {
    selectCategory(categoryId);
  }, [selectCategory, categoryId]);

  const isHighlighted =
    !activeCategoryId &&
    !isSearchMode &&
    categories.findIndex((c) => c.id === categoryId) === highlightedIndex;

  return (
    <Primitive.button
      type="button"
      role="option"
      id={`${popoverId}-option-${categoryId}`}
      aria-selected={isHighlighted}
      data-highlighted={isHighlighted ? "" : undefined}
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

ComposerPrimitiveTriggerPopoverCategoryItem.displayName =
  "ComposerPrimitive.TriggerPopoverCategoryItem";
