"use client";

import {
  ActionButtonElement,
  ActionButtonProps,
  createActionButton,
} from "../../utils/createActionButton";
import { useCallback } from "react";
import {
  useMessage,
  useMessageRuntime,
} from "../../context/react/MessageContext";

const useBranchPickerNext = () => {
  const messageRuntime = useMessageRuntime();
  const disabled = useMessage((m) => m.branchNumber >= m.branchCount);

  const callback = useCallback(() => {
    messageRuntime.switchToBranch({ position: "next" });
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace BranchPickerPrimitiveNext {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerNext>;
}

export const BranchPickerPrimitiveNext = createActionButton(
  "BranchPickerPrimitive.Next",
  useBranchPickerNext,
);
