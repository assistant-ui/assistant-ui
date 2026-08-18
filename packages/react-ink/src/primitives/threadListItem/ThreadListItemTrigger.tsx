import { useThreadListItemTrigger } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

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
