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

const writeTextToClipboard = (text: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return Promise.reject(new Error("Clipboard API is unavailable"));
  }
  return navigator.clipboard.writeText(text);
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
    copyToClipboard: copyToClipboard ?? writeTextToClipboard,
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
