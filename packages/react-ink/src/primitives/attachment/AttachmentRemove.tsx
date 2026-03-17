import type { ReactNode } from "react";
import { useCallback } from "react";
import { useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
