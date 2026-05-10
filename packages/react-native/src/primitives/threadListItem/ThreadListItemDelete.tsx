import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemDelete } from "@assistant-ui/core/react";

export type ThreadListItemDeleteProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemDelete = ({
  children,
  ...pressableProps
}: ThreadListItemDeleteProps) => {
  const { delete: deleteThread } = useThreadListItemDelete();

  return (
    <Pressable onPress={deleteThread} {...pressableProps}>
      {children}
    </Pressable>
  );
};
