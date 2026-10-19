import {
  forwardRef,
  type ComponentRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import { Pressable, type PressableProps } from "react-native";
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
export const ComposerAddAttachment: ForwardRefExoticComponent<
  ComposerAddAttachmentProps & RefAttributes<ComponentRef<typeof Pressable>>
> = forwardRef<ComponentRef<typeof Pressable>, ComposerAddAttachmentProps>(
  ({ children, disabled: disabledProp, ...pressableProps }, ref) => {
    const { disabled } = useComposerAddAttachment();

    return (
      <Primitive.Pressable
        ref={ref}
        disabled={disabledProp ?? disabled}
        accessibilityRole="button"
        {...pressableProps}
      >
        {children}
      </Primitive.Pressable>
    );
  },
);
