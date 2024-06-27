import { useCallback } from "react";
import { useAssistantContext, useThreadContext } from "../context";

export const useSwitchToNewThread = () => {
  const { useAssistantActions } = useAssistantContext();
  const { useComposer } = useThreadContext();

  const switchToNewThread = useCallback(() => {
    useAssistantActions.getState().switchToThread(null);
    useComposer.getState().focus();
  }, [useAssistantActions, useComposer]);

  return switchToNewThread;
};
