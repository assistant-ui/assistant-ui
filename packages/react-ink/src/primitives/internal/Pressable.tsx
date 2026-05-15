import type { ComponentProps, ReactNode } from "react";
import { Box, useFocus, useInput } from "ink";

export type PressableState = {
  isFocused: boolean;
  disabled: boolean;
};

export type PressableProps = Omit<ComponentProps<typeof Box>, "children"> & {
  children: ReactNode | ((state: PressableState) => ReactNode);
  onPress?: (() => void) | undefined;
  disabled?: boolean | undefined;
};

export const Pressable = ({
  children,
  onPress,
  disabled,
  ...boxProps
}: PressableProps) => {
  const isDisabled = !!disabled;
  const { isFocused } = useFocus({ isActive: !isDisabled });

  useInput(
    (input, key) => {
      if ((key.return || input === " ") && onPress) {
        onPress();
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box {...boxProps}>
      {typeof children === "function"
        ? children({ isFocused, disabled: isDisabled })
        : children}
    </Box>
  );
};
