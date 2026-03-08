import type { ReactNode } from "react";
import { useEditComposerCancel } from "../../primitive-hooks/useEditComposerCancel";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type EditComposerCancelProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const EditComposerCancel = ({
  children,
  ...pressableProps
}: EditComposerCancelProps) => {
  const { cancel } = useEditComposerCancel();

  return (
    <Pressable onPress={cancel} {...pressableProps}>
      {children}
    </Pressable>
  );
};
