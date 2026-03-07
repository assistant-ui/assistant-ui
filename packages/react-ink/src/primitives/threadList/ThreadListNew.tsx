import { useCallback, type ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListNewProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListNew = ({
  children,
  ...pressableProps
}: ThreadListNewProps) => {
  const aui = useAui();

  const onPress = useCallback(() => {
    aui.threads().switchToNewThread();
  }, [aui]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
