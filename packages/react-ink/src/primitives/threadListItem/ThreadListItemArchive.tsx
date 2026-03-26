import type { ReactNode } from "react";
import { useThreadListItemArchive } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
