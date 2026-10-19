import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useActionBarSpeak } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ActionBarSpeakProps = Omit<
  PrimitivePressableProps,
  "children" | "onPress"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarSpeak = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarSpeakProps) => {
  const { speak, disabled } = useActionBarSpeak();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Primitive.Pressable
      onPress={() => void speak()}
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

ActionBarSpeak.displayName = "ActionBarPrimitive.Speak";
