import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemDelete } from "@assistant-ui/core/react";

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
    <Pressable
      onPress={deleteThread}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
