import type { ReactNode } from "react";
import { useEditComposerSend } from "../../primitive-hooks/useEditComposerSend";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type EditComposerSendProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const EditComposerSend = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: EditComposerSendProps) => {
  const { send, disabled } = useEditComposerSend();

  return (
    <Pressable
      onPress={send}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
