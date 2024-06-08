import { useCallback } from "react";
import { useAssistantContext } from "../utils/context/AssistantContext";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useReloadMessage = () => {
  const { useThread, useViewport } = useAssistantContext();
  const { useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useMessage],
    (t, m) => t.isRunning || m.message.role !== "assistant",
  );

  if (disabled) return null;

  return useCallback(() => {
    const { parentId } = useMessage.getState();
    useThread.getState().startRun(parentId);
    useViewport.getState().scrollToBottom();
  }, [useMessage, useThread, useViewport]);
};
