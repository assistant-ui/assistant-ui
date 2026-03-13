import type { ReactNode } from "react";
import { useBranchPickerPrevious } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type BranchPickerPreviousProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const BranchPickerPrevious = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerPreviousProps) => {
  const { previous, disabled } = useBranchPickerPrevious();

  return (
    <Pressable
      onPress={previous}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
