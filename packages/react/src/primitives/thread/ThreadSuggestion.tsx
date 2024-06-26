"use client";

import {
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useThreadSuggestion } from "../../primitive-hooks/thread/useThreadSuggestion";

export type ThreadPrimitiveSuggestionProps = ActionButtonProps<
  typeof useThreadSuggestion
>;

export const ThreadPrimitiveSuggestion = createActionButton(
  "ThreadPrimitive.Suggestion",
  useThreadSuggestion,
);
