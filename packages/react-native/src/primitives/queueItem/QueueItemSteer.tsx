import { useCallback } from "react";
import type { PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type QueueItemSteerProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
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
    <Primitive.Pressable
      onPress={handleSteer}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
