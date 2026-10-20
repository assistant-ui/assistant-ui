import type { PressableProps } from "react-native";
import { useThreadListItemDelete } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ThreadListItemDeleteProps = Omit<
  PrimitivePressableProps,
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
    <Primitive.Pressable
      onPress={deleteThread}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
