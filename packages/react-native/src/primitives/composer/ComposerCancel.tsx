import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerCancel } from "../../primitive-hooks/useComposerCancel";

export type ComposerCancelProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ComposerCancel = ({
  children,
  disabled,
  ...pressableProps
}: ComposerCancelProps) => {
  const { cancel, canCancel } = useComposerCancel();

  return (
    <Pressable
      onPress={cancel}
      disabled={disabled ?? !canCancel}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
