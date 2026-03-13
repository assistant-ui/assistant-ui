import type { ReactNode } from "react";
import { useThreadListItemUnarchive } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListItemUnarchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemUnarchive = ({
  children,
  ...pressableProps
}: ThreadListItemUnarchiveProps) => {
  const { unarchive } = useThreadListItemUnarchive();

  return (
    <Pressable onPress={unarchive} {...pressableProps}>
      {children}
    </Pressable>
  );
};
