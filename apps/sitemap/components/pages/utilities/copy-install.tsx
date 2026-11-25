"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

/** A package's name that copies its install command when pressed. */
export function CopyInstall({
  packageName,
  command,
}: {
  packageName: string;
  command: string;
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(command)}
      title={command}
      aria-label={`Copy install command: ${command}`}
      className="group/copy text-muted-foreground hover:text-foreground focus-visible:ring-ring -mx-1 inline-flex max-w-full items-center gap-1.5 rounded-sm px-1 py-0.5 font-mono text-xs transition-colors outline-none [font-variant-ligatures:none] focus-visible:ring-2"
    >
      <span className="truncate">{packageName}</span>
      <span aria-hidden className="relative flex size-3.5 shrink-0">
        <CheckIcon
          className={cn(
            "absolute size-3.5 transition-all duration-100 motion-reduce:transition-none",
            isCopied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <CopyIcon
          className={cn(
            "absolute size-3.5 transition-all duration-100 motion-reduce:transition-none",
            isCopied
              ? "scale-50 opacity-0"
              : "scale-100 opacity-0 group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100 pointer-coarse:opacity-60",
          )}
        />
      </span>
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}
