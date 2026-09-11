import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemArchive } from "@assistant-ui/core/react";

export type ThreadListItemArchiveProps = Omit<
  PressableProps,
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
    <Pressable onPress={archive} accessibilityRole="button" {...pressableProps}>
      {children}
    </Pressable>
  );
};
