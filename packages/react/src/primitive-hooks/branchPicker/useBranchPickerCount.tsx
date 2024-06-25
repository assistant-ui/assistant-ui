"use client";
import { useMessageContext } from "../../context/react/MessageContext";

export const useBranchPickerCount = () => {
  const { useMessage } = useMessageContext();
  const branchCount = useMessage((s) => s.branches.length);
  return branchCount;
};
