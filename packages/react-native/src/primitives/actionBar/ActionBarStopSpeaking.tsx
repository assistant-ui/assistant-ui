import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useActionBarStopSpeaking } from "@assistant-ui/core/react";

export type ActionBarStopSpeakingProps = Omit<PressableProps, "children"> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarStopSpeaking = ({
  children,
  disabled: disabledProp,
  onPress,
  ...pressableProps
}: ActionBarStopSpeakingProps) => {
  const { stopSpeaking, disabled } = useActionBarStopSpeaking();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Pressable
      onPress={(event) => {
        onPress?.(event);
        if (!event.defaultPrevented) {
          stopSpeaking();
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

ActionBarStopSpeaking.displayName = "ActionBarPrimitive.StopSpeaking";
