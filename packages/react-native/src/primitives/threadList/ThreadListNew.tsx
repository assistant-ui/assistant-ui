import { FC, PropsWithChildren, useCallback } from "react";
import { Pressable, PressableProps } from "react-native";
import { useThreadListRuntime } from "../../hooks/useThreadListRuntime";

export type ThreadListNewProps = PropsWithChildren<
  Omit<PressableProps, "onPress"> & {
    onNewThread?: (threadId: string) => void;
  }
>;

export const ThreadListNew: FC<ThreadListNewProps> = ({
  onNewThread,
  children,
  ...pressableProps
}) => {
  const runtime = useThreadListRuntime();

  const handlePress = useCallback(() => {
    const threadId = runtime.switchToNewThread();
    onNewThread?.(threadId);
  }, [runtime, onNewThread]);

  return (
    <Pressable onPress={handlePress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
