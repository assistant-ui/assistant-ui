"use client";
import { useMessage } from "../../context/react/MessageContext";

export const useBranchPickerCount = () => {
  const branchCount = useMessage((s) => s.branchCount);
  return branchCount;
};
