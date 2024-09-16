"use client";
import { useMessage } from "../../context/react/MessageContext";

export const useBranchPickerCount = () => {
  const branchCount = useMessage((s) => s.branches.length);
  return branchCount;
};
