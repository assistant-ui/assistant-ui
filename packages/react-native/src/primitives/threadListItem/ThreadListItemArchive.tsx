import type { PressableProps } from "react-native";
import { useThreadListItemArchive } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ThreadListItemArchiveProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ThreadListItemArchive = ({
  children,
  ...pressableProps
}: ThreadListItemArchiveProps) => {
  const { archive } = useThreadListItemArchive();

  return (
    <Primitive.Pressable
      onPress={archive}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
