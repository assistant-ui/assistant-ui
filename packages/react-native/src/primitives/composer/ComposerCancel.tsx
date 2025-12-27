import { FC, PropsWithChildren, useCallback } from "react";
import { Pressable, PressableProps } from "react-native";
import { useComposerRuntime } from "../../hooks/useComposerRuntime";
import { useThread } from "../../hooks/useThread";

export type ComposerCancelProps = PropsWithChildren<
  Omit<PressableProps, "onPress" | "disabled">
>;

export const ComposerCancel: FC<ComposerCancelProps> = ({
  children,
  ...pressableProps
}) => {
  const runtime = useComposerRuntime();
  const isRunning = useThread((state) => state.isRunning);

  const handlePress = useCallback(() => {
    runtime.cancel();
  }, [runtime]);

  if (!isRunning) {
    return null;
  }

  return (
    <Pressable onPress={handlePress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
