"use client";

import { useMessageContext } from "../../utils/context/MessageContext";
import { useThreadContext } from "../../utils/context/ThreadContext";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerNext = createActionButton(() => {
  const switchToBranch = useThreadContext(
    "BranchPicker.Next",
    (s) => s.chat.switchToBranch,
  );
  const [message, { branchId, branchCount }] = useMessageContext(
    "BranchPicker.Next",
    (s) => [s.message, s.branchState],
  );

  return {
    disabled: branchCount <= 1 || branchId + 1 >= branchCount,
    onClick: () => {
      switchToBranch(message, branchId + 1);
    },
  };
});
