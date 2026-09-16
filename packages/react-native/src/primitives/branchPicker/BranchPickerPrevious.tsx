import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useBranchPickerPrevious } from "@assistant-ui/core/react";

export type BranchPickerPreviousProps = Omit<
  PressableProps,
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
    <Pressable
      onPress={previous}
      disabled={isDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {typeof children === "function"
        ? (state) => children({ ...state, disabled: isDisabled })
        : children}
    </Pressable>
  );
};
