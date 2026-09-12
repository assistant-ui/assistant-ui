import { useCallback, useEffect, useRef, useState } from "react";

export const useCopyToClipboard = ({
  copiedDuration = 2000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  const copyGeneration = useRef(0);
  const latestSuccessfulCopy = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      window.clearTimeout(copiedTimer.current);
    };
  }, []);

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      const generation = ++copyGeneration.current;
      navigator.clipboard.writeText(value).then(
        () => {
          if (generation < latestSuccessfulCopy.current) return;
          latestSuccessfulCopy.current = generation;
          if (!isMounted.current) return;

          window.clearTimeout(copiedTimer.current);
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
