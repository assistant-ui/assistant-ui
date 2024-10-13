import { useCallback } from "react";
import { useAssistantRuntime } from "../context";

/**
 * @deprecated Use `useRuntimeActions().switchToNewThread()` instead. This will be removed in 0.6.0.
 */
export const useSwitchToNewThread = () => {
  const assistantRuntime = useAssistantRuntime();
  const switchToNewThread = useCallback(() => {
    assistantRuntime.switchToNewThread();
  }, [assistantRuntime]);

  return switchToNewThread;
};
