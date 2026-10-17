import type { PressableProps } from "react-native";
import { useComposerSend } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerSendProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerSend = ({
  children,
  disabled,
  ...pressableProps
}: ComposerSendProps) => {
  const { send, disabled: hookDisabled } = useComposerSend();

  return (
    <Primitive.Pressable
      onPress={() => send()}
      disabled={disabled ?? hookDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
