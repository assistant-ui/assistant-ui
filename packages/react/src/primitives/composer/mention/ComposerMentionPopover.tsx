"use client";

import { Primitive } from "@radix-ui/react-primitive";
import {
  type ComponentRef,
  type ComponentPropsWithoutRef,
  forwardRef,
} from "react";
import { useMentionContext } from "./ComposerMentionContext";

// =============================================================================
// MentionPopover — Container that only renders when mention is active
// =============================================================================

export namespace ComposerPrimitiveMentionPopover {
  export type Element = ComponentRef<typeof Primitive.div>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.div>;
}

/**
 * Renders a container for the mention picker popover.
 * Only renders when a `@` trigger is detected in the composer text.
 *
 * @example
 * ```tsx
 * <ComposerPrimitive.MentionRoot adapter={mentionAdapter}>
 *   <ComposerPrimitive.Input />
 *   <ComposerPrimitive.MentionPopover>
 *     <ComposerPrimitive.MentionCategories />
 *   </ComposerPrimitive.MentionPopover>
 * </ComposerPrimitive.MentionRoot>
 * ```
 */
export const ComposerPrimitiveMentionPopover = forwardRef<
  ComposerPrimitiveMentionPopover.Element,
  ComposerPrimitiveMentionPopover.Props
>((props, forwardedRef) => {
  const { open } = useMentionContext();
  if (!open) return null;

  return (
    <Primitive.div
      role="listbox"
      data-state="open"
      {...props}
      ref={forwardedRef}
    />
  );
});

ComposerPrimitiveMentionPopover.displayName =
  "ComposerPrimitive.MentionPopover";
