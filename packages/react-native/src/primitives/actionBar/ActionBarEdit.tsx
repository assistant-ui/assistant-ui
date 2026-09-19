import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useActionBarEdit } from "@assistant-ui/core/react";

export type ActionBarEditProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarEdit = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarEditProps) => {
  const { edit, disabled } = useActionBarEdit();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Pressable
      onPress={edit}
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
