import { useCallback } from "react";
import type { PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type QueueItemRemoveProps = Omit<
  PrimitivePressableProps,
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
    <Primitive.Pressable
      onPress={handleRemove}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
