import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useBranchPickerNext } from "@assistant-ui/core/react";

export type BranchPickerNextProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const BranchPickerNext = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerNextProps) => {
  const { next, disabled } = useBranchPickerNext();

  return (
    <Pressable
      onPress={next}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
