import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useThreadListNew } from "@assistant-ui/core/react";

export type ThreadListNewProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListNew = ({
  children,
  ...pressableProps
}: ThreadListNewProps) => {
  const { switchToNewThread } = useThreadListNew();

  return (
    <Pressable onPress={switchToNewThread} {...pressableProps}>
      {children}
    </Pressable>
  );
};
