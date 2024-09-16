import { useCallback } from "react";
import { useThreadViewport } from "../../context";
import {
  useThreadComposerStore,
  useThreadViewportStore,
} from "../../context/react/ThreadContext";

export const useThreadScrollToBottom = () => {
  const isAtBottom = useThreadViewport((s) => s.isAtBottom);

  const threadViewportStore = useThreadViewportStore();
  const threadComposerStore = useThreadComposerStore();

  const handleScrollToBottom = useCallback(() => {
    threadViewportStore.getState().scrollToBottom();
    threadComposerStore.getState().focus();
  }, [threadViewportStore, threadComposerStore]);

  if (isAtBottom) return null;
  return handleScrollToBottom;
};
