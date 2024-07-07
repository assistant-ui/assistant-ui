import { useState } from "react";
import { UseActionBarCopyProps } from "@assistant-ui/react";

export type useCopyToClipboardProps = UseActionBarCopyProps;

export const useCopyToClipboard = ({
  copiedDuration = 3000,
}: useCopyToClipboardProps = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};
