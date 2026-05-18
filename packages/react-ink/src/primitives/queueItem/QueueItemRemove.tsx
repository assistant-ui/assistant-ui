import type { ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type QueueItemRemoveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const QueueItemRemove = ({
  children,
  ...pressableProps
}: QueueItemRemoveProps) => {
  const aui = useAui();

  return (
    <Pressable onPress={() => aui.queueItem().remove()} {...pressableProps}>
      {children}
    </Pressable>
  );
};
