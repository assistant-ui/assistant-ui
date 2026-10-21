import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useActionBarEdit } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ActionBarEditProps = Omit<
  PrimitivePressableProps,
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
    <Primitive.Pressable
      onPress={edit}
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
