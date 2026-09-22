import { useCallback, useEffect, useRef, useState } from "react";

export const useCopyToClipboard = ({
  copiedDuration = 2000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      navigator.clipboard.writeText(value).then(
        () => {
          if (unmounted.current) return;
          setIsCopied(true);
          clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => {
            copyTimer.current = undefined;
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
