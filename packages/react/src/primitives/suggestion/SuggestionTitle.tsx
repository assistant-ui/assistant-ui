"use client";

import { Primitive } from "@radix-ui/react-primitive";
import { type ElementRef, forwardRef, ComponentPropsWithoutRef } from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace SuggestionPrimitiveTitle {
  export type Element = ElementRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the title of the suggestion.
 *
 * @example
 * ```tsx
 * <SuggestionPrimitive.Title />
 * ```
 */
export const SuggestionPrimitiveTitle = forwardRef<
  SuggestionPrimitiveTitle.Element,
  SuggestionPrimitiveTitle.Props
>((props, ref) => {
  const title = useAuiState((s) => s.suggestion.title);

  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? title}
    </Primitive.span>
  );
});

SuggestionPrimitiveTitle.displayName = "SuggestionPrimitive.Title";
