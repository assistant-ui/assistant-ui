"use client";

import { FC } from "react";
import { useMessageContext } from "../../utils/context/MessageContext";

export const BranchPickerCount: FC = () => {
  const branchCount = useMessageContext(
    "BranchPicker.Count",
    (s) => s.branchState.branchCount,
  );
  return <>{branchCount}</>;
};
