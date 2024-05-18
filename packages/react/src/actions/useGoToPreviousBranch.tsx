import { useAssistantContext } from "../utils/context/AssistantContext";
import { useMessageContext } from "../utils/context/MessageContext";

export const useGoToPreviousBranch = () => {
  const { useThread, useBranchObserver } = useAssistantContext();
  const { useComposer, useMessage } = useMessageContext();

  // TODO compose into one hook call
  const isLoading = useThread((s) => s.isLoading);
  const isEditing = useComposer((s) => s.isEditing);
  const hasNext = useMessage(({ branchState: { branchId } }) => branchId > 0);

  if (isLoading || isEditing || !hasNext) return null;

  return () => {
    const {
      message,
      branchState: { branchId },
    } = useMessage.getState();
    useBranchObserver.getState().switchToBranch(message, branchId - 1);
  };
};
