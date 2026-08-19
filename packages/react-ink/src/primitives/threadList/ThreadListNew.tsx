import { useThreadListNew } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListNewProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ThreadListNew = ({
  children,
  ...pressableProps
}: ThreadListNewProps) => {
  const { switchToNewThread } = useThreadListNew();

  return (
    <Pressable onPress={switchToNewThread} {...pressableProps}>
      {children}
    </Pressable>
  );
};
