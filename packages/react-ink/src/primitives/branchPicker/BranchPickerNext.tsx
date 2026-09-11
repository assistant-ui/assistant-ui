import { useBranchPickerNext } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type BranchPickerNextProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
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
