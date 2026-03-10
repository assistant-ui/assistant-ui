import type { ReactNode } from "react";
import { useComposerCancel } from "../../primitive-hooks/useComposerCancel";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
