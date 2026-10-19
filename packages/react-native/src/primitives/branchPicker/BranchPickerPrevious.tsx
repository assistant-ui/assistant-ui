import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useBranchPickerPrevious } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type BranchPickerPreviousProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const BranchPickerPrevious = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerPreviousProps) => {
  const { previous, disabled } = useBranchPickerPrevious();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Primitive.Pressable
      onPress={previous}
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
