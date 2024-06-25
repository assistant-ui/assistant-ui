"use client";

import { createActionButton } from "../../utils/createActionButton";
import { useThreadScrollToBottom } from "../../primitive-hooks/thread/useThreadScrollToBottom";

export const ThreadScrollToBottom = createActionButton(
  "ThreadScrollToBottom",
  useThreadScrollToBottom,
);
