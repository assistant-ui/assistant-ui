"use client";

import { useMessage } from "../../context/react/MessageContext";

export const useBranchPickerNumber = () => {
  const branchIdx = useMessage((s) => s.branches.indexOf(s.message.id));
  return branchIdx + 1;
};
