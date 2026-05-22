import type { ReactNode } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type QueueItemSteerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const QueueItemSteer = ({
  children,
  ...pressableProps
}: QueueItemSteerProps) => {
  const aui = useAui();

  return (
    <Pressable onPress={() => aui.queueItem().steer()} {...pressableProps}>
      {children}
    </Pressable>
  );
};
