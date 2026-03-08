import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";

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
