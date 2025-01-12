"use client";

import { useCallback } from "react";
import { useThreadViewport } from "../../context";
import { useThreadViewportStore } from "../../context/react/ThreadContext";

export const useThreadScrollToBottom = () => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);

  const threadViewportStore = useThreadViewportStore();

  const handleScrollToBottom = useCallback(() => {
    threadViewportStore.getState().scrollToBottom();
  }, [threadViewportStore]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};
