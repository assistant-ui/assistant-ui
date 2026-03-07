import { useCallback, type ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListItemArchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemArchive = ({
  children,
  ...pressableProps
}: ThreadListItemArchiveProps) => {
  const aui = useAui();

  const onPress = useCallback(() => {
    aui.threadListItem().archive();
  }, [aui]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
