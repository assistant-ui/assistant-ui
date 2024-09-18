import { useCallback } from "react";
import { useAssistantActionsStore } from "../context";
import { useThreadComposerStore } from "../context/react/ThreadContext";

/**
 * @deprecated Use `useRuntimeActions().switchToNewThread()` instead. This will be removed in 0.6.0.
 */
export const useSwitchToNewThread = () => {
  const assistantActionsStore = useAssistantActionsStore();
  const threadComposerStore = useThreadComposerStore();
  const switchToNewThread = useCallback(() => {
    assistantActionsStore.getState().switchToNewThread();
    threadComposerStore.getState().focus();
  }, [assistantActionsStore, threadComposerStore]);

  return switchToNewThread;
};
