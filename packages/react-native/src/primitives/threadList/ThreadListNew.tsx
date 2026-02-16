import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAssistantRuntime } from "../../context";

export type ThreadListNewProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListNew = ({
  children,
  ...pressableProps
}: ThreadListNewProps) => {
  const runtime = useAssistantRuntime();

  const onPress = useCallback(() => {
    runtime.threads.switchToNewThread();
  }, [runtime]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
