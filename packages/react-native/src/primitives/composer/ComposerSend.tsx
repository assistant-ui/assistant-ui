import { FC, PropsWithChildren, useCallback } from "react";
import { Pressable, PressableProps } from "react-native";
import { useComposer } from "../../hooks/useComposer";
import { useComposerRuntime } from "../../hooks/useComposerRuntime";
import { useThread } from "../../hooks/useThread";

export type ComposerSendProps = PropsWithChildren<
  Omit<PressableProps, "onPress" | "disabled">
>;

export const ComposerSend: FC<ComposerSendProps> = ({
  children,
  ...pressableProps
}) => {
  const runtime = useComposerRuntime();
  const canSend = useComposer((state) => state.canSend);
  const isRunning = useThread((state) => state.isRunning);

  const handlePress = useCallback(() => {
    runtime.send();
  }, [runtime]);

  const disabled = !canSend || isRunning;

  return (
    <Pressable onPress={handlePress} disabled={disabled} {...pressableProps}>
      {children}
    </Pressable>
  );
};
