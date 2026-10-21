import { useCallback } from "react";
import type { PressableProps } from "react-native";

import { useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type AttachmentRemoveProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const AttachmentRemove = ({
  children,
  ...pressableProps
}: AttachmentRemoveProps) => {
  const aui = useAui();

  const handleRemove = useCallback(() => {
    aui.attachment.remove();
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
