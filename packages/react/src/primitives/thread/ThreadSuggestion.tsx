"use client";

import { createActionButton } from "../../utils/createActionButton";
import { useThreadSuggestion } from "../../primitive-hooks/thread/useThreadSuggestion";

export const ThreadSuggestion = createActionButton(
  "ThreadSuggestion",
  useThreadSuggestion,
);
