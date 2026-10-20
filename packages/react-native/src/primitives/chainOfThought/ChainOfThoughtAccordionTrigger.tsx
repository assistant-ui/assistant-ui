import { useCallback } from "react";
import type { PressableProps } from "react-native";
import { useAuiState, useAui } from "@assistant-ui/store";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ChainOfThoughtAccordionTriggerProps = Omit<
  PrimitivePressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ChainOfThoughtAccordionTrigger = ({
  children,
  ...pressableProps
}: ChainOfThoughtAccordionTriggerProps) => {
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);

  const onPress = useCallback(() => {
    aui.chainOfThought.setCollapsed(!collapsed);
  }, [aui, collapsed]);

  return (
    <Primitive.Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
