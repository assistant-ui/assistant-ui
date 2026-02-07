"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";

const useChainOfThoughtAccordionTrigger = () => {
  const aui = useAui();
  const collapsed = useAuiState(
    (s) => s.chainOfThought.collapsed,
  );

  const callback = useCallback(() => {
    aui.chainOfThought().setCollapsed(!collapsed);
  }, [aui, collapsed]);

  return callback;
};

export namespace ChainOfThoughtPrimitiveAccordionTrigger {
  export type Element = ActionButtonElement;
  /**
   * Props for the ChainOfThoughtPrimitive.AccordionTrigger component.
   * Inherits all button element props and action button functionality.
   */
  export type Props = ActionButtonProps<
    typeof useChainOfThoughtAccordionTrigger
  >;
}

/**
 * A button component that toggles the collapsed state of the chain of thought accordion.
 *
 * This component automatically handles the toggle functionality, expanding or collapsing
 * the chain of thought parts when clicked.
 *
 * @example
 * ```tsx
 * <ChainOfThoughtPrimitive.AccordionTrigger>
 *   Toggle Reasoning
 * </ChainOfThoughtPrimitive.AccordionTrigger>
 * ```
 */
export const ChainOfThoughtPrimitiveAccordionTrigger = createActionButton(
  "ChainOfThoughtPrimitive.AccordionTrigger",
  useChainOfThoughtAccordionTrigger,
);
