import { useThreadListItemUnarchive } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ThreadListItemUnarchiveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ThreadListItemUnarchive = ({
  children,
  ...pressableProps
}: ThreadListItemUnarchiveProps) => {
  const { unarchive, disabled } = useThreadListItemUnarchive();

  return (
    <Pressable
      onPress={unarchive}
      {...pressableProps}
      disabled={pressableProps.disabled || disabled}
    >
      {children}
    </Pressable>
  );
};
