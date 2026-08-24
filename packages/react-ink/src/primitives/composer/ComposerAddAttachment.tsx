import { useComposerAddAttachment } from "@assistant-ui/core/react";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ComposerAddAttachmentProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children: PressableProps["children"];
};

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
