import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useBranchPickerNext } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type BranchPickerNextProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const BranchPickerNext = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerNextProps) => {
  const { next, disabled } = useBranchPickerNext();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Primitive.Pressable
      onPress={next}
      disabled={isDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {typeof children === "function"
        ? (state) => children({ ...state, disabled: isDisabled })
        : children}
    </Primitive.Pressable>
  );
};
