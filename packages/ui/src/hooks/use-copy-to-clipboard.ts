"use client";

import { useEffect, useRef, useState } from "react";

export type UseCopyToClipboardOptions = {
  copiedDuration?: number;
};

export const useCopyToClipboard = ({
  copiedDuration = 3000,
}: UseCopyToClipboardOptions = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const copyRequest = useRef(0);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const request = ++copyRequest.current;
    navigator.clipboard.writeText(value).then(
      () => {
        if (unmounted.current || request !== copyRequest.current) return;
        setIsCopied(true);
        clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(
          () => setIsCopied(false),
          copiedDuration,
        );
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};
