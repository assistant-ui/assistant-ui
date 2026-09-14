import { Pressable, type PressableProps } from "react-native";
import { useComposerAddAttachment } from "@assistant-ui/core/react";

export type ComposerAddAttachmentProps = Omit<PressableProps, "children"> & {
  children: PressableProps["children"];
};

/**
 * A button for adding attachments. It is disabled while the composer cannot accept attachments.
 *
 * React Native has no file input, so `onPress` receives the platform picker (for example `expo-image-picker`) and hands the selection to `aui.composer.addAttachment`.
 */
export const ComposerAddAttachment = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ComposerAddAttachmentProps) => {
  const { disabled } = useComposerAddAttachment();

  return (
    <Pressable
      disabled={disabledProp ?? disabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
