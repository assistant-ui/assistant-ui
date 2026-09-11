"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy source"}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
      }}
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
