import { useAssistantContext } from "../utils/context/AssistantContext";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useGoToPreviousBranch = () => {
  const { useThread } = useAssistantContext();
  const { useComposer, useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useComposer, useMessage],
    (t, c, m) => t.isRunning || c.isEditing || m.message.branchId <= 0,
  );
  if (disabled) return null;

  return () => {
    const { message } = useMessage.getState();
    useThread.getState().switchToBranch(message.id, message.branchId - 1);
  };
};
