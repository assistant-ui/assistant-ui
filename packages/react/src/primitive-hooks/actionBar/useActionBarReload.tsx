import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useThreadContext } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useActionBarReload = () => {
  const { useThread, useThreadActions, useComposer, useViewport } =
    useThreadContext();
  const { useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useMessage],
    (t, m) => t.isRunning || m.message.role !== "assistant",
  );

  const callback = useCallback(() => {
    const { parentId } = useMessage.getState();
    useThreadActions.getState().startRun(parentId);
    useViewport.getState().scrollToBottom();
    useComposer.getState().focus();
  }, [useThreadActions, useComposer, useViewport, useMessage]);

  if (disabled) return null;
  return callback;
};
