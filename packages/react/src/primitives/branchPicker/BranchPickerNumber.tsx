"use client";

import type { FC } from "react";
import { useMessageContext } from "../../utils/context/useMessageContext";

export const BranchPickerNumber: FC = () => {
  const { useMessage } = useMessageContext();
  const branchIdx = useMessage((s) => s.branches.indexOf(s.message.id));
  return <>{branchIdx + 1}</>;
};
