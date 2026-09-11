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
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(copiedTimer.current);
    };
  }, []);

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      navigator.clipboard.writeText(value).then(
        () => {
          if (!isMounted.current) return;

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
