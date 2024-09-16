import { useCallback } from "react";
import { useAssistantActionsStore } from "../context";
import { useThreadComposerStore } from "../context/react/ThreadContext";

export const useSwitchToNewThread = () => {
  const assistantActionsStore = useAssistantActionsStore();
  const threadComposerStore = useThreadComposerStore();
  const switchToNewThread = useCallback(() => {
    assistantActionsStore.getState().switchToThread(null);
    threadComposerStore.getState().focus();
  }, [assistantActionsStore, threadComposerStore]);

  return switchToNewThread;
};
