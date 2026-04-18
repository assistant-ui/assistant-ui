import type { ReactNode } from "react";
import { useThreadListNew } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
