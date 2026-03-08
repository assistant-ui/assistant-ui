import type { ReactNode } from "react";
import {
  useActionBarCopy,
  type UseActionBarCopyOptions,
} from "../../primitive-hooks/useActionBarCopy";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ActionBarCopyProps = Omit<PressableProps, "onPress" | "children"> &
  UseActionBarCopyOptions & {
    children: ReactNode | ((props: { isCopied: boolean }) => ReactNode);
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

  return (
    <Pressable
      onPress={copy}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {typeof children === "function" ? children({ isCopied }) : children}
    </Pressable>
  );
};
