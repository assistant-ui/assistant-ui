import type { PressableProps } from "react-native";
import { useComposerAddAttachment } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ComposerAddAttachmentProps = Omit<
  PrimitivePressableProps,
  "children"
> & {
  children: PressableProps["children"];
};

/**
 * A button for adding attachments. It is disabled while the composer cannot accept attachments.
 *
 * React Native has no file input, so the caller opens the platform picker (for example `expo-image-picker`) in `onPress` and passes the selection to `aui.composer.addAttachment`.
 */
export const ComposerAddAttachment = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: ComposerAddAttachmentProps) => {
  const { disabled } = useComposerAddAttachment();

  return (
    <Primitive.Pressable
      disabled={disabledProp ?? disabled}
      accessibilityRole="button"
      {...pressableProps}
    >
      {children}
    </Primitive.Pressable>
  );
};
