import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useBranchPickerPrevious } from "@assistant-ui/core/react";

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
