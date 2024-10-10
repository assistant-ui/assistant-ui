import { useCallback } from "react";
import { useThreadViewportStore } from "../context";
import {
  useThreadComposerStore,
  useThreadRuntime,
} from "../context/react/ThreadContext";
import { CreateAppendMessage } from "../api/ThreadRuntime";

/**
 * @deprecated Use `useThreadRuntime().append()` instead. This will be removed in 0.6.
 */
export const useAppendMessage = () => {
  const threadRuntime = useThreadRuntime();
  const threadViewportStore = useThreadViewportStore();
  const threadComposerStore = useThreadComposerStore();

  const append = useCallback(
    (message: CreateAppendMessage) => {
      threadRuntime.append(message);

      threadViewportStore.getState().scrollToBottom();
      threadComposerStore.getState().focus();
    },
    [threadRuntime, threadViewportStore, threadComposerStore],
  );

  return append;
};
