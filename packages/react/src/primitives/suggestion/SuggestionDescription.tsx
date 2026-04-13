"use client";

import { Primitive } from "../../utils/Primitive";
import {
  type ElementRef,
  forwardRef,
  type ComponentPropsWithoutRef,
} from "react";
import { useAuiState } from "@assistant-ui/store";

export namespace SuggestionPrimitiveDescription {
  export type Element = ElementRef<typeof Primitive.span>;
  export type Props = ComponentPropsWithoutRef<typeof Primitive.span>;
}

/**
 * Renders the description/label of the suggestion.
 *
 * @example
 * ```tsx
 * <SuggestionPrimitive.Description />
 * ```
 */
export const SuggestionPrimitiveDescription = forwardRef<
  SuggestionPrimitiveDescription.Element,
  SuggestionPrimitiveDescription.Props
>((props, ref) => {
  const label = useAuiState((s) => s.suggestion.label);

  return (
    <Primitive.span {...props} ref={ref}>
      {props.children ?? label}
    </Primitive.span>
  );
});

SuggestionPrimitiveDescription.displayName = "SuggestionPrimitive.Description";
