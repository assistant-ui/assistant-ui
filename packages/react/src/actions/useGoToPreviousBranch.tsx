import { useCallback } from "react";
import { useAssistantContext } from "../context/AssistantContext";
import { useMessageContext } from "../context/MessageContext";
import { useCombinedStore } from "../utils/combined/useCombinedStore";

export const useGoToPreviousBranch = () => {
  const { useThread } = useAssistantContext();
  const { useMessage, useComposer } = useMessageContext();

  const disabled = useCombinedStore(
    [useMessage, useComposer],
    (m, c) => c.isEditing || m.branches.indexOf(m.message.id) <= 0,
  );

  const callback = useCallback(() => {
    const { message, branches } = useMessage.getState();
    useThread
      .getState()
      .switchToBranch(branches[branches.indexOf(message.id) - 1]!);
  }, [useMessage, useThread]);

  if (disabled) return null;
  return callback;
};
