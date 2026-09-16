import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useActionBarSpeak } from "@assistant-ui/core/react";

export type ActionBarSpeakProps = Omit<PressableProps, "children"> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarSpeak = ({
  children,
  disabled: disabledProp,
  onPress,
  ...pressableProps
}: ActionBarSpeakProps) => {
  const { speak, disabled } = useActionBarSpeak();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Pressable
      onPress={(event) => {
        onPress?.(event);
        if (!event.defaultPrevented) {
          void speak();
        }
      }}
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

ActionBarSpeak.displayName = "ActionBarPrimitive.Speak";
