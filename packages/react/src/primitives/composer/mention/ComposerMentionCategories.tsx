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
import type { Unstable_MentionCategory } from "@assistant-ui/core";

// =============================================================================
// MentionCategories — Renders the list of categories
// =============================================================================

export namespace ComposerPrimitiveMentionCategories {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div> & {
    /**
     * Render function that receives the filtered categories and returns
     * the UI. A render-function pattern is used here (instead of a
     * `components` prop) to give consumers full control over list layout,
     * ordering, grouping, and empty states.
     */
    children: (categories: readonly Unstable_MentionCategory[]) => ReactNode;
  };
}

/**
 * Renders the mention categories. Accepts a render function that receives
 * the list of categories and returns the UI.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionCategories>
 *   {(categories) => categories.map(cat => (
 *     <ComposerPrimitive.MentionCategoryItem key={cat.id} categoryId={cat.id}>
 *       {cat.label}
 *     </ComposerPrimitive.MentionCategoryItem>
 *   ))}
 * </ComposerPrimitive.MentionCategories>
 * ```
 */
export const ComposerPrimitiveMentionCategories = forwardRef<
  ComposerPrimitiveMentionCategories.Element,
  ComposerPrimitiveMentionCategories.Props
>(({ children, ...props }, forwardedRef) => {
  const { categories, activeCategoryId } = useMentionContext();

  if (activeCategoryId) return null;

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
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionCategoryItem categoryId="catalog">
 *   Catalog
 * </ComposerPrimitive.MentionCategoryItem>
 * ```
 */
export const ComposerPrimitiveMentionCategoryItem = forwardRef<
  ComposerPrimitiveMentionCategoryItem.Element,
  ComposerPrimitiveMentionCategoryItem.Props
>(({ categoryId, onClick, ...props }, forwardedRef) => {
  const { selectCategory } = useMentionContext();

  const handleClick = useCallback(() => {
    selectCategory(categoryId);
  }, [selectCategory, categoryId]);

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

ComposerPrimitiveMentionCategoryItem.displayName =
  "ComposerPrimitive.MentionCategoryItem";
