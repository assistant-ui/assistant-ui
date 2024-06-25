import { useCallback } from "react";
import { useMessageContext } from "../../context/react/MessageContext";
import { useThreadContext } from "../../context/react/ThreadContext";
import { useCombinedStore } from "../../utils/combined/useCombinedStore";

export const useBranchPickerPrevious = () => {
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
