import type { ReactNode } from "react";
import { useCallback } from "react";
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

  const handleSteer = useCallback(() => {
    aui.queueItem().steer();
  }, [aui]);

  return (
    <Pressable onPress={handleSteer} {...pressableProps}>
      {children}
    </Pressable>
  );
};
