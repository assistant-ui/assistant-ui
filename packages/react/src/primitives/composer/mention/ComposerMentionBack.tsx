"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
} from "react";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useMentionContext } from "./ComposerMentionContext";

// =============================================================================
// MentionBack — Button to navigate back from items to categories
// =============================================================================

export namespace ComposerPrimitiveMentionBack {
  export type Element = ComponentRef<typeof Primitive.button>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

/**
 * A button that navigates back from category items to the category list.
 * Only renders when a category is active (drill-down view).
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionBack>
 *   &larr; Back
 * </ComposerPrimitive.MentionBack>
 * ```
 */
export const ComposerPrimitiveMentionBack = forwardRef<
  ComposerPrimitiveMentionBack.Element,
  ComposerPrimitiveMentionBack.Props
>(({ onClick, ...props }, forwardedRef) => {
  const { activeCategoryId, isSearchMode, goBack } = useMentionContext();

  const handleClick = useCallback(() => {
    goBack();
  }, [goBack]);

  if (!activeCategoryId || isSearchMode) return null;

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={forwardedRef}
      onClick={composeEventHandlers(onClick, handleClick)}
    />
  );
});

ComposerPrimitiveMentionBack.displayName = "ComposerPrimitive.MentionBack";
