import type { PressableProps } from "react-native";
import { useThreadListItemUnarchive } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ThreadListItemUnarchiveProps = Omit<
  PrimitivePressableProps,
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
    <Primitive.Pressable
      onPress={unarchive}
      accessibilityRole="button"
      {...pressableProps}
      disabled={pressableProps.disabled || disabled}
      accessibilityState={{
        ...pressableProps.accessibilityState,
        disabled: pressableProps.disabled || disabled,
      }}
    >
      {children}
    </Primitive.Pressable>
  );
};
