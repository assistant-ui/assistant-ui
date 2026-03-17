"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  forwardRef,
  useCallback,
} from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMentionContext } from "./ComposerMentionContext";
import type { Unstable_MentionItem } from "@assistant-ui/core";

// =============================================================================
// MentionItems — Renders the list of items within a category
// =============================================================================

export namespace ComposerPrimitiveMentionItems {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = Omit<
    ComponentPropsWithoutRef<typeof Primitive.div>,
    "children"
  > & {
    /**
     * Render function that receives the filtered items and returns
     * the UI. A render-function pattern is used here (instead of a
     * `components` prop) to give consumers full control over list layout,
     * ordering, grouping, and empty states.
     */
    children: (items: readonly Unstable_MentionItem[]) => ReactNode;
  };
}

export const ComposerPrimitiveMentionItems = forwardRef<
  ComposerPrimitiveMentionItems.Element,
  ComposerPrimitiveMentionItems.Props
>(({ children, ...props }, forwardedRef) => {
  const { items, activeCategoryId, isSearchMode } = useMentionContext();

  if (!activeCategoryId && !isSearchMode) return null;

  return (
    <Primitive.div role="group" {...props} ref={forwardedRef}>
      {children(items)}
    </Primitive.div>
  );
});

ComposerPrimitiveMentionItems.displayName = "ComposerPrimitive.MentionItems";

// =============================================================================
// MentionItem — A single selectable mention item
// =============================================================================

export namespace ComposerPrimitiveMentionItem {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button> & {
    item: Unstable_MentionItem;
    /** Position in the items list. Used for keyboard highlight matching. Falls back to findIndex by id. */
    index?: number | undefined;
  };
}

/**
 * A button that inserts the mention item into the composer.
 * Automatically receives `data-highlighted` when keyboard-navigated.
 */
export const ComposerPrimitiveMentionItem = forwardRef<
  ComposerPrimitiveMentionItem.Element,
  ComposerPrimitiveMentionItem.Props
>(({ item, index: indexProp, onClick, ...props }, forwardedRef) => {
  const {
    selectItem,
    items,
    highlightedIndex,
    activeCategoryId,
    isSearchMode,
  } = useMentionContext();

  const handleClick = useCallback(() => {
    selectItem(item);
  }, [selectItem, item]);

  // Use explicit index prop if provided, fall back to findIndex
  const itemIndex = indexProp ?? items.findIndex((i) => i.id === item.id);
  const isHighlighted =
    (isSearchMode || activeCategoryId !== null) &&
    itemIndex === highlightedIndex;

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

ComposerPrimitiveMentionItem.displayName = "ComposerPrimitive.MentionItem";
