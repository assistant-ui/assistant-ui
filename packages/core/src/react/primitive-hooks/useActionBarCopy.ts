import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export type UseActionBarCopyOptions = {
  copiedDuration?: number | undefined;
  copyToClipboard?: ((text: string) => void | Promise<void>) | undefined;
};

export const useActionBarCopy = ({
  copiedDuration = 3000,
  copyToClipboard,
}: UseActionBarCopyOptions = {}) => {
  const aui = useAui();
  const disabled = useAuiState((s) => {
    return !(
      (s.message.role !== "assistant" ||
        s.message.status?.type !== "running") &&
      s.message.parts.some((c) => c.type === "text" && c.text.length > 0)
    );
  });
  const isCopied = useAuiState((s) => s.message.isCopied);
  const isEditing = useAuiState((s) => s.composer.isEditing);
  const composerValue = useAuiState((s) => s.composer.text);

  const copy = useCallback(() => {
    const valueToCopy = isEditing ? composerValue : aui.message().getCopyText();
    if (!valueToCopy) return;

    const write = copyToClipboard ?? (() => {});
    const result = write(valueToCopy);
    Promise.resolve(result).then(() => {
      aui.message().setIsCopied(true);
      setTimeout(() => aui.message().setIsCopied(false), copiedDuration);
    });
  }, [aui, isEditing, composerValue, copiedDuration, copyToClipboard]);

  return { copy, disabled, isCopied };
};
