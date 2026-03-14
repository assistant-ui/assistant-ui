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
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    /**
     * Render function that receives the filtered items and returns
     * the UI. A render-function pattern is used here (instead of a
     * `components` prop) to give consumers full control over list layout,
     * ordering, grouping, and empty states.
     */
    children: (items: readonly Unstable_MentionItem[]) => ReactNode;
  };
}

/**
 * Renders the mention items for the active category. Accepts a render function
 * that receives the list of items.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionItems>
 *   {(items) => items.map(item => (
 *     <ComposerPrimitive.MentionItem key={item.id} item={item}>
 *       {item.label}
 *     </ComposerPrimitive.MentionItem>
 *   ))}
 * </ComposerPrimitive.MentionItems>
 * ```
 */
export const ComposerPrimitiveMentionItems = forwardRef<
  ComposerPrimitiveMentionItems.Element,
  ComposerPrimitiveMentionItems.Props
>(({ children, ...props }, forwardedRef) => {
  const { items, activeCategoryId } = useMentionContext();

  if (!activeCategoryId) return null;

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
  };
}

/**
 * A button that inserts the mention item into the composer.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionItem item={item}>
 *   {item.label}
 * </ComposerPrimitive.MentionItem>
 * ```
 */
export const ComposerPrimitiveMentionItem = forwardRef<
  ComposerPrimitiveMentionItem.Element,
  ComposerPrimitiveMentionItem.Props
>(({ item, onClick, ...props }, forwardedRef) => {
  const { selectItem } = useMentionContext();

  const handleClick = useCallback(() => {
    selectItem(item);
  }, [selectItem, item]);

  return (
    <Primitive.button
      type="button"
      role="option"
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

ComposerPrimitiveMentionItem.displayName = "ComposerPrimitive.MentionItem";
