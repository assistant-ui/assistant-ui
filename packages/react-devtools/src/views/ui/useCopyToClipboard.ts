import { useCallback, useEffect, useRef, useState } from "react";

export const useCopyToClipboard = ({
  copiedDuration = 2000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const scopeGenerationRef = useRef(0);

  useEffect(
    () => () => {
      scopeGenerationRef.current += 1;
      if (copiedTimerRef.current !== undefined) {
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = undefined;
      }
      setIsCopied(false);
    },
    [],
  );

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      const scopeGeneration = scopeGenerationRef.current;
      navigator.clipboard.writeText(value).then(
        () => {
          if (scopeGeneration !== scopeGenerationRef.current) return;
          if (copiedTimerRef.current !== undefined) {
            clearTimeout(copiedTimerRef.current);
          }
          setIsCopied(true);
          copiedTimerRef.current = setTimeout(() => {
            copiedTimerRef.current = undefined;
            setIsCopied(false);
          }, copiedDuration);
        },
        () => {},
      );
    },
    [copiedDuration],
  );

  return { isCopied, copy };
};
