import { useCallback } from "react";
import { useAuiState, useAui } from "@assistant-ui/store";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ChainOfThoughtAccordionTriggerProps = Omit<
  PressableProps,
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
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
