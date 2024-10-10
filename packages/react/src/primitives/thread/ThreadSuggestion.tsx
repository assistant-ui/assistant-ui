"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadSuggestion } from "../../primitive-hooks/thread/useThreadSuggestion";

/**
 * @deprecated Use `ThreadPrimitive.Suggestion.Props` instead. This will be removed in 0.6.
 */
export type ThreadPrimitiveSuggestionProps = ThreadPrimitiveSuggestion.Props;

export namespace ThreadPrimitiveSuggestion {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadSuggestion>;
}

export const ThreadPrimitiveSuggestion = createActionButton(
  "ThreadPrimitive.Suggestion",
  useThreadSuggestion,
  ["prompt", "autoSend", "method"],
);
