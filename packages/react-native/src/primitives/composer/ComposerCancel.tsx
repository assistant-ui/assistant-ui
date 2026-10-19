import { forwardRef, type ComponentRef } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerCancel } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerCancelProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerCancel = forwardRef<
  ComponentRef<typeof Pressable>,
  ComposerCancelProps
>(({ children, disabled, ...pressableProps }, ref) => {
  const { cancel, disabled: hookDisabled } = useComposerCancel();

  return (
    <Primitive.Pressable
      ref={ref}
      onPress={cancel}
      disabled={disabled ?? hookDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
});
