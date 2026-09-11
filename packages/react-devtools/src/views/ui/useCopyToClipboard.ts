import { useCallback, useEffect, useRef, useState } from "react";

export const useCopyToClipboard = ({
  copiedDuration = 2000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const copyGeneration = useRef(0);

  useEffect(
    () => () => {
      copyGeneration.current += 1;
      clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      const generation = ++copyGeneration.current;
      navigator.clipboard.writeText(value).then(
        () => {
          if (generation !== copyGeneration.current) return;

          clearTimeout(copiedTimer.current);
          setIsCopied(true);
          copiedTimer.current = window.setTimeout(() => {
            copiedTimer.current = undefined;
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
