"use client";

import { FC } from "react";
import { useMessageContext } from "../../utils/context/MessageContext";

export const BranchPickerNumber: FC = () => {
  const branchId = useMessageContext(
    "BranchPicker.Number",
    (s) => s.branchState.branchId,
  );
  return <>{branchId + 1}</>;
};
