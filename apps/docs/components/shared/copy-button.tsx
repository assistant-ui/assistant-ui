"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import {
  ghostButton,
  iconSwap,
  iconSwapIn,
  iconSwapOut,
} from "@/components/assistant-ui/elements/surfaces";

export function CopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1600,
  });

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy source"}
      onClick={() => copyToClipboard(text)}
      className={cn(
        ghostButton,
        "grid size-7 place-items-center",
        copied && "text-emerald-500",
        className,
      )}
    >
      <CopyIcon
        className={cn(iconSwap, "size-3.5", copied ? iconSwapOut : iconSwapIn)}
      />
      <CheckIcon
        className={cn(iconSwap, "size-3.5", copied ? iconSwapIn : iconSwapOut)}
      />
    </button>
  );
}
