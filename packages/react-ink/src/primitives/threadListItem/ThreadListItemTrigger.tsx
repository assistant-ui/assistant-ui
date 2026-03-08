import { useCallback, type ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListItemTriggerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ThreadListItemTrigger = ({
  children,
  ...pressableProps
}: ThreadListItemTriggerProps) => {
  const aui = useAui();

  const onPress = useCallback(() => {
    aui.threadListItem().switchTo();
  }, [aui]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
