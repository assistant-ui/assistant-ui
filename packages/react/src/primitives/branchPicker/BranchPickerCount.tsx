"use client";

import type { FC } from "react";
import { useMessageContext } from "../../utils/context/useMessageContext";

export const BranchPickerCount: FC = () => {
  const { useMessage } = useMessageContext();
  const branchCount = useMessage((s) => s.message.branchCount);
  return <>{branchCount}</>;
};
