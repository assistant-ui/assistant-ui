import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";

export type AttachmentRemoveProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const AttachmentRemove = ({
  children,
  ...pressableProps
}: AttachmentRemoveProps) => {
  const aui = useAui();

  const handleRemove = useCallback(() => {
    aui.attachment().remove();
  }, [aui]);

  return (
    <Pressable onPress={handleRemove} {...pressableProps}>
      {children}
    </Pressable>
  );
};
