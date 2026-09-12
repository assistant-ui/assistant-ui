"use client";

import { useEffect, useRef, useState } from "react";

export type UseCopyToClipboardOptions = {
  copiedDuration?: number;
};

export const useCopyToClipboard = ({
  copiedDuration = 3000,
}: UseCopyToClipboardOptions = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const copyGeneration = useRef(0);
  const latestSuccessfulCopy = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      clearTimeout(copiedTimer.current);
    };
  }, []);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const generation = ++copyGeneration.current;
    navigator.clipboard.writeText(value).then(
      () => {
        if (generation < latestSuccessfulCopy.current) return;
        latestSuccessfulCopy.current = generation;
        if (!isMounted.current) return;

        clearTimeout(copiedTimer.current);
        setIsCopied(true);
        copiedTimer.current = setTimeout(() => {
          copiedTimer.current = undefined;
          setIsCopied(false);
        }, copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};
