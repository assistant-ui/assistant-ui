import { useCallback } from "react";
import { Pressable, type PressableProps } from "react-native";

import { useAui } from "@assistant-ui/store";

export type AttachmentRemoveProps = Omit<
  PressableProps,
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
    <Pressable
      onPress={handleRemove}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
