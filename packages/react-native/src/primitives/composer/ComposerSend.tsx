import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerSend } from "../../primitive-hooks/useComposerSend";

export type ComposerSendProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ComposerSend = ({
  children,
  disabled,
  ...pressableProps
}: ComposerSendProps) => {
  const { send, canSend } = useComposerSend();

  return (
    <Pressable
      onPress={send}
      disabled={disabled ?? !canSend}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
