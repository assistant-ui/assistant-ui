import { Pressable, type PressableProps } from "react-native";
import { useThreadListItemUnarchive } from "@assistant-ui/core/react";

export type ThreadListItemUnarchiveProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

export const ThreadListItemUnarchive = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ThreadListItemUnarchiveProps) => {
  const { unarchive, disabled } = useThreadListItemUnarchive();

  return (
    <Pressable
      onPress={unarchive}
      accessibilityRole="button"
      {...pressableProps}
      disabled={disabledProp || disabled}
    >
      {children}
    </Pressable>
  );
};
