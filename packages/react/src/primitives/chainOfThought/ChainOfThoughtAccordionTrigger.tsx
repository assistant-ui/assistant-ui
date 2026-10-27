"use client";

import type { ActionButtonElement } from "../../utils/createActionButton";
import { type ComponentPropsWithoutRef, forwardRef, useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";
import { composeEventHandlers } from "radix-ui/internal";
import { Primitive } from "../../utils/Primitive";

export namespace ChainOfThoughtPrimitiveAccordionTrigger {
  export type Element = ActionButtonElement;
  /**
   * Props for the ChainOfThoughtPrimitive.AccordionTrigger component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ComponentPropsWithoutRef<typeof Primitive.button>;
}

/**
 * A button component that toggles the collapsed state of the chain of thought accordion.
 *
 * This component automatically handles the toggle functionality, expanding or collapsing
 * the chain of thought parts when clicked.
 * Exposes the current disclosure state through `aria-expanded`.
 *
 * @example
 * ```tsx
 * <ChainOfThoughtPrimitive.AccordionTrigger>
 *   Toggle Reasoning
 * </ChainOfThoughtPrimitive.AccordionTrigger>
 * ```
 */
export const ChainOfThoughtPrimitiveAccordionTrigger = forwardRef<
  ChainOfThoughtPrimitiveAccordionTrigger.Element,
  ChainOfThoughtPrimitiveAccordionTrigger.Props
>(({ onClick, ...props }, ref) => {
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  const toggle = useCallback(() => {
    aui.chainOfThought.setCollapsed(!collapsed);
  }, [aui, collapsed]);

  return (
    <Primitive.button
      type="button"
      {...props}
      ref={ref}
      aria-expanded={!collapsed}
      onClick={composeEventHandlers(onClick, toggle)}
    />
  );
});

ChainOfThoughtPrimitiveAccordionTrigger.displayName =
  "ChainOfThoughtPrimitive.AccordionTrigger";
