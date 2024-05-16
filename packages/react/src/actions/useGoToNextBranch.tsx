import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useGoToNextBranch = () => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Next",
    (s) => s.chat.switchToBranch,
  );

  const context = useMessageContext("BranchPicker.Next", (s) => {
    const {
      message,
      editState: { isEditing },
      branchState: { branchId, branchCount },
    } = s;
    if (isEditing || branchCount <= 1 || branchId + 1 >= branchCount)
      return null;

    return { message, branchId };
  });

  if (!context) return null;

  const { message, branchId } = context;
  return () => {
    switchToBranch(message, branchId + 1);
  };
};
