import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerAddAttachment } from "@assistant-ui/core/react";

export type ComposerAddAttachmentProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

/**
 * A button that triggers the attachment adding flow.
 *
 * Note: The actual file picker implementation is platform-specific.
 * This component calls `useComposerAddAttachment()` from `@assistant-ui/core/react`.
 * You must handle the file selection in your own component using the returned `addAttachment` callback.
 */
export const ComposerAddAttachment = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ComposerAddAttachmentProps) => {
  const { disabled } = useComposerAddAttachment();

  return (
    <Pressable disabled={disabledProp ?? disabled} {...pressableProps}>
      {children}
    </Pressable>
  );
};
