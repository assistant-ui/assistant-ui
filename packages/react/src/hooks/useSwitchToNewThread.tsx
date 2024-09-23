import { useCallback } from "react";
import { useThreadComposerStore } from "../context/react/ThreadContext";
import { useAssistantRuntime } from "../context";

/**
 * @deprecated Use `useRuntimeActions().switchToNewThread()` instead. This will be removed in 0.6.0.
 */
export const useSwitchToNewThread = () => {
  const assistantRuntime = useAssistantRuntime();
  const threadComposerStore = useThreadComposerStore();
  const switchToNewThread = useCallback(() => {
    assistantRuntime.switchToNewThread();
    threadComposerStore.getState().focus();
  }, [assistantRuntime, threadComposerStore]);

  return switchToNewThread;
};
