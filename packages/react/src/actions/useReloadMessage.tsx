import { useCallback } from "react";
import { useMessageContext } from "../context/MessageContext";
import { useThreadContext } from "../context/ThreadContext";
import { useCombinedStore } from "../utils/combined/useCombinedStore";

export const useReloadMessage = () => {
  const { useThread, useViewport } = useThreadContext();
  const { useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useMessage],
    (t, m) => t.isRunning || m.message.role !== "assistant",
  );

  const callback = useCallback(() => {
    const { parentId } = useMessage.getState();
    useThread.getState().startRun(parentId);
    useViewport.getState().scrollToBottom();
  }, [useMessage, useThread, useViewport]);

  if (disabled) return null;
  return callback;
};
