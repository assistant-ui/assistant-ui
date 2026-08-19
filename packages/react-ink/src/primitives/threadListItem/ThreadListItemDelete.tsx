import { useThreadListItemDelete } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListItemDeleteProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
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
