import { useCallback } from "react";
import { useMessageContext } from "../context/MessageContext";
import { useThreadContext } from "../context/ThreadContext";
import { useCombinedStore } from "../utils/combined/useCombinedStore";

export const useReloadMessage = () => {
  const { useThread, useThreadActions, useViewport } = useThreadContext();
  const { useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useMessage],
    (t, m) => t.isRunning || m.message.role !== "assistant",
  );

  const callback = useCallback(() => {
    const { parentId } = useMessage.getState();
    useThreadActions.getState().startRun(parentId);
    useViewport.getState().scrollToBottom();
  }, [useThreadActions, useMessage, useViewport]);

  if (disabled) return null;
  return callback;
};
