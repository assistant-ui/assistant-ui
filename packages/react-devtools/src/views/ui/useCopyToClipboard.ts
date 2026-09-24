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
  const copyGenerationRef = useRef(0);

  useEffect(
    () => () => {
      copyGenerationRef.current += 1;
      if (copiedTimerRef.current === undefined) return;
      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = undefined;
    },
    [],
  );

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      const copyGeneration = ++copyGenerationRef.current;
      navigator.clipboard.writeText(value).then(
        () => {
          if (copyGeneration !== copyGenerationRef.current) return;
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
