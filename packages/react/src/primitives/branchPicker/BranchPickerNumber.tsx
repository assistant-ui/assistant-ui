"use client";

import type { FC } from "react";
import { useMessageContext } from "../../context/MessageContext";

export const BranchPickerNumber: FC = () => {
  const { useMessage } = useMessageContext();
  const branchIdx = useMessage((s) => s.branches.indexOf(s.message.id));
  return <>{branchIdx + 1}</>;
};
