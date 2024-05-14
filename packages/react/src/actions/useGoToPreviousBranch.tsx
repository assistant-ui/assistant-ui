"use client";
import { useMessageContext } from "../utils/context/MessageContext";
import { useThreadContext } from "../utils/context/ThreadContext";

export const useGoToPreviousBranch = () => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Previous",
    (s) => s.chat.switchToBranch,
  );
  const [message, { branchId, branchCount }] = useMessageContext(
    "BranchPicker.Previous",
    (s) => [s.message, s.branchState],
  );

  if (branchCount <= 1 || branchId <= 0) return null;
  return () => {
    switchToBranch(message, branchId - 1);
  };
};
