import { type ReactNode, useCallback } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";

export type QueueItemSteerProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const QueueItemSteer = ({
  children,
  ...pressableProps
}: QueueItemSteerProps) => {
  const aui = useAui();

  const handleSteer = useCallback(() => {
    aui.queueItem.steer();
  }, [aui]);

  return (
    <Pressable onPress={handleSteer} {...pressableProps}>
      {children}
    </Pressable>
  );
};
