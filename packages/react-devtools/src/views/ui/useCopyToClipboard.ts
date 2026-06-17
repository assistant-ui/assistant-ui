import { useCallback, useState } from "react";

export const useCopyToClipboard = ({
  copiedDuration = 2000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    (value: string) => {
      if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
        return;
      }
      navigator.clipboard.writeText(value).then(
        () => {
          setIsCopied(true);
          window.setTimeout(() => setIsCopied(false), copiedDuration);
        },
        () => {},
      );
    },
    [copiedDuration],
  );

  return { isCopied, copy };
};
