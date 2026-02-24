import { useCallback, type ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAuiState, useAui } from "@assistant-ui/store";

export type ChainOfThoughtAccordionTriggerProps = Omit<
  PressableProps,
  "onPress"
> & {
  children: ReactNode;
};

export const ChainOfThoughtAccordionTrigger = ({
  children,
  ...pressableProps
}: ChainOfThoughtAccordionTriggerProps) => {
  const aui = useAui();
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);

  const onPress = useCallback(() => {
    aui.chainOfThought().setCollapsed(!collapsed);
  }, [aui, collapsed]);

  return (
    <Pressable onPress={onPress} {...pressableProps}>
      {children}
    </Pressable>
  );
};
