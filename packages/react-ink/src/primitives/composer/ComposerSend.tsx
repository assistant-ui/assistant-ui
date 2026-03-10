import type { ReactNode } from "react";
import { useComposerSend } from "../../primitive-hooks/useComposerSend";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
