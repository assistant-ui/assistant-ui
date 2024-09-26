import { useCallback } from "react";
import { useThreadViewportStore } from "../context";
import {
  useThreadComposerStore,
  useThreadRuntime,
} from "../context/react/ThreadContext";
import { CreateAppendMessage } from "../api/ThreadRuntime";

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
