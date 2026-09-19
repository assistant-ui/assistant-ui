import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import {
  useActionBarCopy,
  type UseActionBarCopyOptions,
} from "@assistant-ui/core/react";

export type ActionBarCopyProps = Omit<PressableProps, "onPress" | "children"> &
  UseActionBarCopyOptions & {
    children:
      | ReactNode
      | ((props: { isCopied: boolean; disabled: boolean }) => ReactNode);
  };

export const ActionBarCopy = ({
  children,
  disabled: disabledProp,
  copiedDuration,
  copyToClipboard,
  ...pressableProps
}: ActionBarCopyProps) => {
  const { copy, disabled, isCopied } = useActionBarCopy({
    copiedDuration,
    copyToClipboard,
  });
  const isDisabled = disabledProp ?? disabled;

  return (
    <Pressable
      onPress={copy}
      disabled={isDisabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {typeof children === "function"
        ? children({ isCopied, disabled: isDisabled })
        : children}
    </Pressable>
  );
};
