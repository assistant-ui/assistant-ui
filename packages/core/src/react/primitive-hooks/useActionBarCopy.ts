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
  const scopeGenerationRef = useRef(0);

  useEffect(
    () => () => {
      scopeGenerationRef.current += 1;
      if (copiedTimerRef.current === undefined) return;

      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = undefined;
      aui.message.setIsCopied(false);
    },
    [aui],
  );

  const copy = useCallback(() => {
    if (!copyToClipboard) return;

    const valueToCopy = isEditing ? composerValue : aui.message.getCopyText();
    if (!valueToCopy) return;
    const scopeGeneration = scopeGenerationRef.current;

    // The rejection handler swallows clipboard write failures (permission denied,
    // API unavailable) so they don't surface as unhandled promise rejections.
    Promise.resolve(copyToClipboard(valueToCopy)).then(
      () => {
        if (scopeGeneration !== scopeGenerationRef.current) return;

        if (copiedTimerRef.current !== undefined) {
          clearTimeout(copiedTimerRef.current);
        }
        aui.message.setIsCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          copiedTimerRef.current = undefined;
          aui.message.setIsCopied(false);
        }, copiedDuration);
      },
      () => {},
    );
  }, [aui, isEditing, composerValue, copiedDuration, copyToClipboard]);

  return { copy, disabled: disabled || !copyToClipboard, isCopied };
};
