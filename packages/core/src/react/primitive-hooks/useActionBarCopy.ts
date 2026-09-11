import { useCallback, useEffect, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import { actionBarCopyDisabled } from "../../store/primitive-predicates";

export type UseActionBarCopyOptions = {
  copiedDuration?: number | undefined;
  copyToClipboard?: ((text: string) => void | Promise<void>) | undefined;
};

export const useActionBarCopy = ({
  copiedDuration = 3000,
  copyToClipboard,
}: UseActionBarCopyOptions = {}) => {
  const aui = useAui();
  const disabled = useAuiState(actionBarCopyDisabled);
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

    // The writer runs synchronously inside the press so the user-gesture gating
    // of navigator.clipboard survives (WebKit scopes it to the stack); the try
    // contains a synchronously throwing caller-supplied writer, and the rejection
    // handler swallows clipboard failures (permission denied, API unavailable) so
    // they don't surface as unhandled rejections.
    let write: void | Promise<void>;
    try {
      write = copyToClipboard(valueToCopy);
    } catch {
      return;
    }

    Promise.resolve(write).then(
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
