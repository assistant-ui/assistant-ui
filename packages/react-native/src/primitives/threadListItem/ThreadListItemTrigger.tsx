import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemTrigger } from "@assistant-ui/core/react";

export type ThreadListItemTriggerProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ThreadListItemTrigger = ({
  children,
  ...pressableProps
}: ThreadListItemTriggerProps) => {
  const { switchTo } = useThreadListItemTrigger();

  return (
    <Pressable onPress={switchTo} {...pressableProps}>
      {children}
    </Pressable>
  );
};
