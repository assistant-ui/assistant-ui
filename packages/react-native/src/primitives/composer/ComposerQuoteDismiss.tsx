import { forwardRef, useCallback, type ComponentRef } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerQuoteDismissProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerQuoteDismiss = forwardRef<
  ComponentRef<typeof Pressable>,
  ComposerQuoteDismissProps
>(({ children, ...pressableProps }, ref) => {
  const aui = useAui();

  const handleDismiss = useCallback(() => {
    aui.composer.setQuote(undefined);
  }, [aui]);

  return (
    <Primitive.Pressable
      ref={ref}
      onPress={handleDismiss}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
});
