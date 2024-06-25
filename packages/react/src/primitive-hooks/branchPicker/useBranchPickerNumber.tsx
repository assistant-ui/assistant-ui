"use client";
import { useMessageContext } from "../../context/react/MessageContext";

export const useBranchPickerNumber = () => {
  const { useMessage } = useMessageContext();
  const branchIdx = useMessage((s) => s.branches.indexOf(s.message.id));
  return branchIdx + 1;
};
