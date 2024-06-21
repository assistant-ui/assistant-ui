import { useCallback } from "react";
import { useMessageContext } from "../context/MessageContext";
import { useThreadContext } from "../context/ThreadContext";
import { useCombinedStore } from "../utils/combined/useCombinedStore";

export const useGoToPreviousBranch = () => {
  const { useThreadActions } = useThreadContext();
  const { useMessage, useComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => c.isEditing || m.branches.indexOf(m.message.id) <= 0,
  );

  const callback = useCallback(() => {
    const { message, branches } = useMessage.getState();
    useThreadActions
      .getState()
      .switchToBranch(branches[branches.indexOf(message.id) - 1]!);
  }, [useThreadActions, useMessage]);

  if (disabled) return null;
  return callback;
};
