import type { ReactNode } from "react";
import { useAuiState } from "@assistant-ui/store";
import { useComposerAddAttachment } from "../../primitive-hooks/useComposerAddAttachment";
import { Pressable, type PressableProps } from "../internal/Pressable";

export type ComposerAddAttachmentProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

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
