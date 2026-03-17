import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerCancel } from "@assistant-ui/core/react";

export type ComposerCancelProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const ComposerCancel = ({
  children,
  disabled,
  ...pressableProps
}: ComposerCancelProps) => {
  const { cancel, disabled: hookDisabled } = useComposerCancel();

  return (
    <Pressable
      onPress={cancel}
      disabled={disabled ?? hookDisabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
