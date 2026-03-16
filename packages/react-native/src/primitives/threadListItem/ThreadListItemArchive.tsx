import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemArchive } from "@assistant-ui/core/react";

export type ThreadListItemArchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemArchive = ({
  children,
  ...pressableProps
}: ThreadListItemArchiveProps) => {
  const { archive } = useThreadListItemArchive();

  return (
    <Pressable onPress={archive} {...pressableProps}>
      {children}
    </Pressable>
  );
};
