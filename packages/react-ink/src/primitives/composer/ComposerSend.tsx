import type { ReactNode } from "react";
import { useComposerSend } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ComposerSendProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
  queueWhileRunning?: boolean;
};

export const ComposerSend = ({
  children,
  disabled,
  queueWhileRunning,
  ...pressableProps
}: ComposerSendProps) => {
  const { send, disabled: hookDisabled } = useComposerSend(queueWhileRunning);

  return (
    <Pressable
      onPress={() => send()}
      disabled={disabled ?? hookDisabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
