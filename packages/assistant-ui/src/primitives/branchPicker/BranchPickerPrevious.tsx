"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerPrevious = createActionButton(() => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Previous",
    (s) => s.chat.switchToBranch,
  );
  const [message, { branchId, branchCount }] = useMessageContext(
    "BranchPicker.Previous",
    (s) => [s.message, s.branchState],
  );

  return {
    disabled: branchCount <= 1 || branchId <= 0,
    onClick: () => {
      switchToBranch(message, branchId - 1);
    },
  };
});
