import { useCallback } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";

export type QueueItemRemoveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const QueueItemRemove = ({
  children,
  ...pressableProps
}: QueueItemRemoveProps) => {
  const aui = useAui();

  const handleRemove = useCallback(() => {
    aui.queueItem.remove();
  }, [aui]);

  return (
    <Pressable onPress={handleRemove} {...pressableProps}>
      {children}
    </Pressable>
  );
};
