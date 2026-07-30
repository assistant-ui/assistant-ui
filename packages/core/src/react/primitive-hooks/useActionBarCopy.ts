import { useCallback, useEffect, useRef } from "react";
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
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearCopiedTimer = useCallback(() => {
    if (copiedTimerRef.current === undefined) return;
    clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = undefined;
  }, []);

  useEffect(() => clearCopiedTimer, [aui, clearCopiedTimer]);

  const copy = useCallback(() => {
    if (!copyToClipboard) return;

    const valueToCopy = isEditing ? composerValue : aui.message.getCopyText();
    if (!valueToCopy) return;

    // The rejection handler swallows clipboard write failures (permission denied,
    // API unavailable) so they don't surface as unhandled promise rejections.
    Promise.resolve(copyToClipboard(valueToCopy)).then(
      () => {
        clearCopiedTimer();
        aui.message.setIsCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          copiedTimerRef.current = undefined;
          aui.message.setIsCopied(false);
        }, copiedDuration);
      },
      () => {},
    );
  }, [
    aui,
    isEditing,
    composerValue,
    copiedDuration,
    copyToClipboard,
    clearCopiedTimer,
  ]);

  return { copy, disabled: disabled || !copyToClipboard, isCopied };
};
