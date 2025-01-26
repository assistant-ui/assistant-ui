"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import { useThreadViewport } from "../../context";
import { useThreadViewportStore } from "../../context/react/ThreadContext";

const useThreadScrollToBottom = () => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);

  const threadViewportStore = useThreadViewportStore();

  const handleScrollToBottom = useCallback(() => {
    threadViewportStore.getState().scrollToBottom();
  }, [threadViewportStore]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};

export namespace ThreadPrimitiveScrollToBottom {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useThreadScrollToBottom>;
}

export const ThreadPrimitiveScrollToBottom = createActionButton(
  "ThreadPrimitive.ScrollToBottom",
  useThreadScrollToBottom,
);
