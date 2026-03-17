import type { ReactNode } from "react";
import { useThreadListItemDelete } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
