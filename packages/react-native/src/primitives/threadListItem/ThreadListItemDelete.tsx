import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";

export type ThreadListItemDeleteProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemDelete = ({
  children,
  ...pressableProps
}: ThreadListItemDeleteProps) => {
  const aui = useAui();

  const onPress = useCallback(() => {
    aui.threadListItem().delete();
  }, [aui]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
