import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useEditComposerCancel } from "../../primitive-hooks/useEditComposerCancel";

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
