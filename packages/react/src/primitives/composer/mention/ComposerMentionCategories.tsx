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
import { useMentionContext } from "./ComposerMentionContext";
import type { Unstable_MentionCategory } from "@assistant-ui/core";

// =============================================================================
// MentionCategories — Renders the list of categories
// =============================================================================

export namespace ComposerPrimitiveMentionCategories {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "children"
  > & {
    /**
     * Render function that receives the filtered categories and returns
     * the UI. A render-function pattern is used here (instead of a
     * `components` prop) to give consumers full control over list layout,
     * ordering, grouping, and empty states.
     */
    children: (categories: readonly Unstable_MentionCategory[]) => ReactNode;
  };
}

export const ComposerPrimitiveMentionCategories = forwardRef<
  ComposerPrimitiveMentionCategories.Element,
  ComposerPrimitiveMentionCategories.Props
>(({ children, ...props }, forwardedRef) => {
  const { categories, activeCategoryId, isSearchMode } = useMentionContext();

  if (activeCategoryId || isSearchMode) return null;

  return (
    <Primitive.div role="group" {...props} ref={forwardedRef}>
      {children(categories)}
    </Primitive.div>
  );
});

ComposerPrimitiveMentionCategories.displayName =
  "ComposerPrimitive.MentionCategories";

// =============================================================================
// MentionCategoryItem — A single category row (clickable to drill-down)
// =============================================================================

export namespace ComposerPrimitiveMentionCategoryItem {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button> & {
    categoryId: string;
  };
}

/**
 * A button that selects a category and triggers drill-down navigation.
 * Automatically receives `data-highlighted` when keyboard-navigated.
 */
export const ComposerPrimitiveMentionCategoryItem = forwardRef<
  ComposerPrimitiveMentionCategoryItem.Element,
  ComposerPrimitiveMentionCategoryItem.Props
>(({ categoryId, onClick, ...props }, forwardedRef) => {
  const {
    selectCategory,
    categories,
    highlightedIndex,
    activeCategoryId,
    isSearchMode,
  } = useMentionContext();

  const handleClick = useCallback(() => {
    selectCategory(categoryId);
  }, [selectCategory, categoryId]);

  // Derive highlighted state from context — no manual wiring needed
  const isHighlighted =
    !activeCategoryId &&
    !isSearchMode &&
    categories.findIndex((c) => c.id === categoryId) === highlightedIndex;

  return (
    <Primitive.button
      type="button"
      role="option"
      aria-selected={isHighlighted}
      data-highlighted={isHighlighted ? "" : undefined}
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

ComposerPrimitiveMentionCategoryItem.displayName =
  "ComposerPrimitive.MentionCategoryItem";
