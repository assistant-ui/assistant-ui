import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useComposerAddAttachment } from "../../primitive-hooks/useComposerAddAttachment";
import { useAuiState } from "@assistant-ui/store";

export type ComposerAddAttachmentProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

/**
 * A button that triggers the attachment adding flow.
 *
 * Note: The actual file picker implementation is platform-specific.
 * This component calls `useComposerAddAttachment()` from your primitive-hooks.
 * You must handle the file selection in your own component using the returned `addAttachment` callback.
 */
export const ComposerAddAttachment = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ComposerAddAttachmentProps) => {
  const isDisabled = useAuiState((s) => !s.composer.isEditing);
  const { addAttachment: _addAttachment } = useComposerAddAttachment();

  return (
    <Pressable disabled={disabledProp ?? isDisabled} {...pressableProps}>
      {children}
    </Pressable>
  );
};
