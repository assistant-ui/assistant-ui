import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useActionBarReload } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ActionBarReloadProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarReload = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarReloadProps) => {
  const { reload, disabled } = useActionBarReload();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Primitive.Pressable
      onPress={reload}
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
