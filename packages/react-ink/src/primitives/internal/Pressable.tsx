import type { ComponentProps, ReactNode } from "react";
import { Box, useFocus, useInput } from "ink";

export type PressableProps = ComponentProps<typeof Box> & {
  children: ReactNode;
  onPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
};

export const Pressable = ({
  children,
  onPress,
  disabled,
  ...boxProps
}: PressableProps) => {
  const { isFocused } = useFocus({ isActive: !disabled });

  useInput(
    (_input, key) => {
      if (key.return && onPress) {
        onPress();
      }
    },
    { isActive: isFocused && !disabled },
  );

  return <Box {...boxProps}>{children}</Box>;
};
