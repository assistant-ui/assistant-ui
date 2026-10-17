import { useCallback } from "react";
import type { PressableProps } from "react-native";
import { useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerQuoteDismissProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ComposerQuoteDismiss = ({
  children,
  ...pressableProps
}: ComposerQuoteDismissProps) => {
  const aui = useAui();

  const handleDismiss = useCallback(() => {
    aui.composer.setQuote(undefined);
  }, [aui]);

  return (
    <Primitive.Pressable
      onPress={handleDismiss}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
