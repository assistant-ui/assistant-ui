import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useGoToPreviousBranch = () => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Previous",
    (s) => s.chat.switchToBranch,
  );
  const context = useMessageContext("BranchPicker.Previous", (s) => {
    const {
      message,
      editState: { isEditing },
      branchState: { branchId, branchCount },
    } = s;
    if (isEditing || branchCount <= 1 || branchId <= 0) return null;
    return { message, branchId };
  });

  if (!context) return null;

  const { message, branchId } = context;
  return () => {
    switchToBranch(message, branchId - 1);
  };
};
