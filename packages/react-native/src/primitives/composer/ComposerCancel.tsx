import type { PressableProps } from "react-native";
import { useComposerCancel } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerCancelProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerCancel = ({
  children,
  disabled,
  ...pressableProps
}: ComposerCancelProps) => {
  const { cancel, disabled: hookDisabled } = useComposerCancel();

  return (
    <Primitive.Pressable
      onPress={cancel}
      disabled={disabled ?? hookDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
