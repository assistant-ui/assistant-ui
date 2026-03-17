import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemUnarchive } from "@assistant-ui/core/react";

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
