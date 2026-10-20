import type { ReactNode } from "react";
import type { PressableStateCallbackType } from "react-native";
import { useActionBarStopSpeaking } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ActionBarStopSpeakingProps = Omit<
  PrimitivePressableProps,
  "children" | "onPress"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { disabled: boolean },
      ) => ReactNode);
};

export const ActionBarStopSpeaking = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ActionBarStopSpeakingProps) => {
  const { stopSpeaking, disabled } = useActionBarStopSpeaking();
  const isDisabled = disabledProp ?? disabled;

  return (
    <Primitive.Pressable
      onPress={() => stopSpeaking()}
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

ActionBarStopSpeaking.displayName = "ActionBarPrimitive.StopSpeaking";
