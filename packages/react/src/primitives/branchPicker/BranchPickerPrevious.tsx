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

const useBranchPickerPrevious = () => {
  const messageRuntime = useMessageRuntime();
  const disabled = useMessage((m) => m.branchNumber <= 1);

  const callback = useCallback(() => {
    messageRuntime.switchToBranch({ position: "previous" });
  }, [messageRuntime]);

  if (disabled) return null;
  return callback;
};

export namespace BranchPickerPrimitivePrevious {
  export type Element = ActionButtonElement;
  export type Props = ActionButtonProps<typeof useBranchPickerPrevious>;
}

export const BranchPickerPrimitivePrevious = createActionButton(
  "BranchPickerPrimitive.Previous",
  useBranchPickerPrevious,
);
