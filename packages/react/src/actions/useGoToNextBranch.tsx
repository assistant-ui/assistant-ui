"use client";
import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useGoToNextBranch = () => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Next",
    (s) => s.chat.switchToBranch,
  );
  const [message, { branchId, branchCount }] = useMessageContext(
    "BranchPicker.Next",
    (s) => [s.message, s.branchState],
  );

  if (branchCount <= 1 || branchId + 1 >= branchCount) return null;

  return () => {
    switchToBranch(message, branchId + 1);
  };
};
