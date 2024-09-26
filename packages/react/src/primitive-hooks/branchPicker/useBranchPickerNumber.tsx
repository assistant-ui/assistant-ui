"use client";

import { useMessage } from "../../context/react/MessageContext";

export const useBranchPickerNumber = () => {
  const branchNumber = useMessage((s) => s.branchNumber);
  return branchNumber;
};
