import { useAssistantContext } from "../utils/context/AssistantContext";
import { useCombinedStore } from "../utils/context/combined/useCombinedStore";
import { useMessageContext } from "../utils/context/useMessageContext";

export const useGoToPreviousBranch = () => {
  const { useThread, useBranchObserver } = useAssistantContext();
  const { useComposer, useMessage } = useMessageContext();

  const disabled = useCombinedStore(
    [useThread, useComposer, useMessage],
    (t, c, m) => t.isLoading || c.isEditing || m.branchState.branchId <= 0,
  );
  if (disabled) return null;

  return () => {
    const {
      message,
      branchState: { branchId },
    } = useMessage.getState();
    useBranchObserver.getState().switchToBranch(message, branchId - 1);
  };
};
