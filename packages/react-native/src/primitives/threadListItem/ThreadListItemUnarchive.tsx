import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";

export type ThreadListItemUnarchiveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemUnarchive = ({
  children,
  ...pressableProps
}: ThreadListItemUnarchiveProps) => {
  const aui = useAui();

  const onPress = useCallback(() => {
    aui.threadListItem().unarchive();
  }, [aui]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
